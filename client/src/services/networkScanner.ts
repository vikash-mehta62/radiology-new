/**
 * Network Scanner Utility
 * Handles low-level network scanning and device detection
 * Optimized for medical device discovery with safety considerations
 */

export interface ScanTarget {
  ip: string;
  port: number;
  protocol: 'TCP' | 'UDP' | 'HTTP' | 'HTTPS';
}

export interface ScanResult {
  target: ScanTarget;
  isOpen: boolean;
  responseTime: number;
  service?: string;
  banner?: string;
  error?: string;
}

export interface NetworkInterface {
  name: string;
  address: string;
  netmask: string;
  family: 'IPv4' | 'IPv6';
  internal: boolean;
}

export interface ScanProgress {
  totalTargets: number;
  completedTargets: number;
  currentTarget?: ScanTarget;
  estimatedTimeRemaining: number;
}

class NetworkScannerService {
  private scanAbortController?: AbortController;
  private progressCallback?: (progress: ScanProgress) => void;

  /**
   * Scan multiple targets concurrently
   */
  async scanTargets(
    targets: ScanTarget[],
    options: {
      timeout?: number;
      maxConcurrent?: number;
      onProgress?: (progress: ScanProgress) => void;
    } = {}
  ): Promise<ScanResult[]> {
    const {
      timeout = 5000,
      maxConcurrent = 10,
      onProgress
    } = options;

    this.progressCallback = onProgress;
    this.scanAbortController = new AbortController();

    const results: ScanResult[] = [];
    const semaphore = new ScanSemaphore(maxConcurrent);
    const startTime = performance.now();
    let completedCount = 0;

    const scanPromises = targets.map(async (target, index) => {
      await semaphore.acquire();
      
      try {
        if (this.scanAbortController?.signal.aborted) {
          throw new Error('Scan aborted');
        }

        const result = await this.scanSingleTarget(target, timeout);
        results[index] = result;
        
        completedCount++;
        
        // Report progress
        if (onProgress) {
          const elapsed = performance.now() - startTime;
          const avgTimePerTarget = elapsed / completedCount;
          const remaining = targets.length - completedCount;
          const estimatedTimeRemaining = avgTimePerTarget * remaining;

          onProgress({
            totalTargets: targets.length,
            completedTargets: completedCount,
            currentTarget: target,
            estimatedTimeRemaining
          });
        }

        return result;
      } finally {
        semaphore.release();
      }
    });

    await Promise.allSettled(scanPromises);
    return results.filter(Boolean); // Remove any undefined results
  }

  /**
   * Scan a single target
   */
  private async scanSingleTarget(target: ScanTarget, timeout: number): Promise<ScanResult> {
    const startTime = performance.now();
    
    try {
      let isOpen = false;
      let service: string | undefined;
      let banner: string | undefined;

      switch (target.protocol) {
        case 'HTTP':
          ({ isOpen, service, banner } = await this.scanHttp(target, timeout, false));
          break;
        case 'HTTPS':
          ({ isOpen, service, banner } = await this.scanHttp(target, timeout, true));
          break;
        case 'TCP':
          ({ isOpen, service, banner } = await this.scanTcp(target, timeout));
          break;
        case 'UDP':
          ({ isOpen, service, banner } = await this.scanUdp(target, timeout));
          break;
      }

      const responseTime = performance.now() - startTime;

      return {
        target,
        isOpen,
        responseTime,
        service,
        banner
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        target,
        isOpen: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Scan HTTP/HTTPS endpoint
   */
  private async scanHttp(
    target: ScanTarget, 
    timeout: number, 
    useHttps: boolean
  ): Promise<{ isOpen: boolean; service?: string; banner?: string }> {
    const protocol = useHttps ? 'https' : 'http';
    const url = `${protocol}://${target.ip}:${target.port}/`;

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(timeout)
      });

      const server = response.headers.get('server') || '';
      const contentType = response.headers.get('content-type') || '';
      
      // Identify service based on headers and response
      let service = 'HTTP';
      if (server.toLowerCase().includes('orthanc')) {
        service = 'Orthanc DICOM Server';
      } else if (server.toLowerCase().includes('apache')) {
        service = 'Apache HTTP Server';
      } else if (server.toLowerCase().includes('nginx')) {
        service = 'Nginx HTTP Server';
      } else if (server.toLowerCase().includes('iis')) {
        service = 'Microsoft IIS';
      } else if (contentType.includes('application/dicom')) {
        service = 'DICOM Web Service';
      }

      return {
        isOpen: true,
        service,
        banner: server || `HTTP ${response.status}`
      };

    } catch (error) {
      // Check if it's a connection error vs timeout
      if (error instanceof Error && error.name === 'AbortError') {
        return { isOpen: false };
      }
      
      // Some services might reject HEAD requests but still be open
      try {
        const getResponse = await fetch(url, {
          method: 'GET',
          signal: AbortSignal.timeout(timeout / 2)
        });
        
        return {
          isOpen: true,
          service: 'HTTP (GET only)',
          banner: getResponse.headers.get('server') || `HTTP ${getResponse.status}`
        };
      } catch (getError) {
        return { isOpen: false };
      }
    }
  }

  /**
   * Scan TCP port (simplified - uses WebSocket as proxy)
   */
  private async scanTcp(
    target: ScanTarget, 
    timeout: number
  ): Promise<{ isOpen: boolean; service?: string; banner?: string }> {
    try {
      // Use WebSocket connection as a proxy for TCP connectivity test
      // In a real implementation, you'd use Node.js net module
      const ws = new WebSocket(`ws://${target.ip}:${target.port}`);
      
      return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          ws.close();
          resolve({ isOpen: false });
        }, timeout);

        ws.onopen = () => {
          clearTimeout(timeoutId);
          ws.close();
          
          // Try to identify service based on common ports
          const service = this.identifyServiceByPort(target.port);
          resolve({
            isOpen: true,
            service,
            banner: `TCP connection successful`
          });
        };

        ws.onerror = () => {
          clearTimeout(timeoutId);
          resolve({ isOpen: false });
        };
      });

    } catch (error) {
      return { isOpen: false };
    }
  }

  /**
   * Scan UDP port (limited capability in browser)
   */
  private async scanUdp(
    target: ScanTarget, 
    timeout: number
  ): Promise<{ isOpen: boolean; service?: string; banner?: string }> {
    // UDP scanning is very limited in browser environment
    // This is a placeholder - real implementation would need server-side component
    console.warn('UDP scanning not fully supported in browser environment');
    
    return {
      isOpen: false,
      service: 'UDP scan not supported'
    };
  }

  /**
   * Identify service based on common port numbers
   */
  private identifyServiceByPort(port: number): string {
    const commonPorts: Record<number, string> = {
      21: 'FTP',
      22: 'SSH',
      23: 'Telnet',
      25: 'SMTP',
      53: 'DNS',
      80: 'HTTP',
      104: 'DICOM',
      110: 'POP3',
      143: 'IMAP',
      443: 'HTTPS',
      993: 'IMAPS',
      995: 'POP3S',
      2762: 'DICOM TLS',
      4242: 'DICOM (Orthanc)',
      8080: 'HTTP Alternate',
      8042: 'Orthanc HTTP',
      8443: 'HTTPS Alternate',
      11112: 'DICOM (dcm4che)'
    };

    return commonPorts[port] || `TCP/${port}`;
  }

  /**
   * Get local network interfaces
   */
  async getNetworkInterfaces(): Promise<NetworkInterface[]> {
    // In browser environment, we can't directly access network interfaces
    // This would need to be implemented server-side or use WebRTC for local IP detection
    
    try {
      // Try to detect local IP using WebRTC
      const localIp = await this.getLocalIpViaWebRTC();
      
      if (localIp) {
        return [{
          name: 'local',
          address: localIp,
          netmask: '255.255.255.0', // Assume /24
          family: 'IPv4',
          internal: false
        }];
      }
    } catch (error) {
      console.warn('Could not detect local IP:', error);
    }

    // Return common local network ranges as fallback
    return [
      {
        name: 'local-192',
        address: '192.168.1.1',
        netmask: '255.255.255.0',
        family: 'IPv4',
        internal: false
      },
      {
        name: 'local-10',
        address: '10.0.0.1',
        netmask: '255.255.0.0',
        family: 'IPv4',
        internal: false
      }
    ];
  }

  /**
   * Detect local IP address using WebRTC
   */
  private async getLocalIpViaWebRTC(): Promise<string | null> {
    return new Promise((resolve) => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      pc.createDataChannel('');
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate;
          const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
          
          if (ipMatch && !ipMatch[1].startsWith('127.')) {
            pc.close();
            resolve(ipMatch[1]);
            return;
          }
        }
      };

      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .catch(() => resolve(null));

      // Timeout after 5 seconds
      setTimeout(() => {
        pc.close();
        resolve(null);
      }, 5000);
    });
  }

  /**
   * Generate IP range from CIDR notation
   */
  generateIpRange(cidr: string): string[] {
    const [baseIp, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength, 10);
    
    if (prefix === 24) {
      // Handle /24 networks (most common)
      const octets = baseIp.split('.').map(Number);
      const ips: string[] = [];
      
      for (let i = 1; i < 255; i++) {
        ips.push(`${octets[0]}.${octets[1]}.${octets[2]}.${i}`);
      }
      
      return ips;
    } else if (prefix === 16) {
      // Handle /16 networks (limit to reasonable size)
      const octets = baseIp.split('.').map(Number);
      const ips: string[] = [];
      
      for (let i = 1; i < 255; i++) {
        for (let j = 1; j < 255; j++) {
          ips.push(`${octets[0]}.${octets[1]}.${i}.${j}`);
          if (ips.length > 1000) break; // Limit to prevent browser freeze
        }
        if (ips.length > 1000) break;
      }
      
      return ips;
    }
    
    // For other prefix lengths, return just the base IP
    return [baseIp];
  }

  /**
   * Generate common DICOM port list
   */
  getCommonDicomPorts(): number[] {
    return [
      104,    // Standard DICOM
      2762,   // DICOM TLS
      4242,   // Orthanc default
      8042,   // Orthanc HTTP
      8080,   // Common HTTP alternate
      11112,  // dcm4che default
      8443,   // HTTPS alternate
      9999,   // Some PACS systems
      5678    // Some modalities
    ];
  }

  /**
   * Abort current scan
   */
  abortScan(): void {
    if (this.scanAbortController) {
      this.scanAbortController.abort();
    }
  }

  /**
   * Check if scan is in progress
   */
  isScanInProgress(): boolean {
    return this.scanAbortController !== undefined && !this.scanAbortController.signal.aborted;
  }

  /**
   * Ping a single host (simplified)
   */
  async ping(ip: string, timeout: number = 3000): Promise<{ success: boolean; responseTime: number }> {
    const startTime = performance.now();
    
    try {
      // Use HTTP HEAD request to port 80 as a ping substitute
      const response = await fetch(`http://${ip}:80/`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(timeout),
        mode: 'no-cors' // Avoid CORS issues
      });
      
      const responseTime = performance.now() - startTime;
      return { success: true, responseTime };
      
    } catch (error) {
      // Try HTTPS as fallback
      try {
        await fetch(`https://${ip}:443/`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(timeout / 2),
          mode: 'no-cors'
        });
        
        const responseTime = performance.now() - startTime;
        return { success: true, responseTime };
        
      } catch (httpsError) {
        const responseTime = performance.now() - startTime;
        return { success: false, responseTime };
      }
    }
  }

  /**
   * Perform traceroute (simplified)
   */
  async traceroute(targetIp: string): Promise<{ hop: number; ip: string; responseTime: number }[]> {
    // Traceroute is not possible in browser environment
    // This is a placeholder for server-side implementation
    console.warn('Traceroute not supported in browser environment');
    return [];
  }
}

/**
 * Semaphore for controlling concurrent scans
 */
class ScanSemaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      this.permits--;
      resolve();
    }
  }
}

export const networkScanner = new NetworkScannerService();