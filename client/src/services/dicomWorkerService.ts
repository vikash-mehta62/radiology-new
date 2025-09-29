/**
 * Service for managing Web Worker communication for DICOM rendering
 * Provides a clean interface for client-side DICOM processing
 */

interface WorkerMessage {
    type: string;
    id: string;
    data?: any;
    success?: boolean;
    error?: string;
}

interface RenderRawPixelsData {
    rawData: ArrayBuffer;
    width: number;
    height: number;
    pixelFormat: string;
    windowCenter?: number;
    windowWidth?: number;
}

interface RenderResult {
    imageBitmap: ImageBitmap;
    width: number;
    height: number;
}

export class DicomWorkerService {
    private worker: Worker | null = null;
    private messageId = 0;
    private pendingMessages = new Map<string, {
        resolve: (value: any) => void;
        reject: (error: Error) => void;
    }>();
    private isReady = false;

    constructor() {
        this.initializeWorker();
    }

    private initializeWorker(): void {
        try {
            // Create the worker from the worker file
            this.worker = new Worker(
                new URL('../workers/dicomRenderWorker.js', import.meta.url),
                { type: 'module' }
            );

            this.worker.onmessage = this.handleWorkerMessage.bind(this);
            this.worker.onerror = this.handleWorkerError.bind(this);
        } catch (error) {
            console.error('Failed to initialize DICOM worker:', error);
        }
    }

    private handleWorkerMessage(event: MessageEvent<WorkerMessage>): void {
        const { type, id, success, data, error } = event.data;

        if (type === 'READY') {
            this.isReady = true;
            console.log('DICOM Worker is ready');
            return;
        }

        if (id && this.pendingMessages.has(id)) {
            const { resolve, reject } = this.pendingMessages.get(id)!;
            this.pendingMessages.delete(id);

            if (success) {
                resolve(data);
            } else {
                reject(new Error(error || 'Worker operation failed'));
            }
        }
    }

    private handleWorkerError(error: ErrorEvent): void {
        console.error('DICOM Worker error:', error);
        
        // Reject all pending messages
        this.pendingMessages.forEach(({ reject }) => {
            reject(new Error('Worker error occurred'));
        });
        this.pendingMessages.clear();
    }

    private sendMessage(type: string, data?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.worker || !this.isReady) {
                reject(new Error('Worker not ready'));
                return;
            }

            const id = `msg_${++this.messageId}`;
            this.pendingMessages.set(id, { resolve, reject });

            this.worker.postMessage({ type, id, data });

            // Set a timeout to prevent hanging
            setTimeout(() => {
                if (this.pendingMessages.has(id)) {
                    this.pendingMessages.delete(id);
                    reject(new Error('Worker operation timeout'));
                }
            }, 30000); // 30 second timeout
        });
    }

    /**
     * Render raw pixel data to an ImageBitmap
     * @param rawData - Raw pixel data from server
     * @param width - Image width
     * @param height - Image height
     * @param pixelFormat - Pixel format (e.g., 'uint16')
     * @param windowCenter - Optional window center for display
     * @param windowWidth - Optional window width for display
     * @returns Promise<RenderResult> - Rendered image bitmap and dimensions
     */
    async renderRawPixels(
        rawData: ArrayBuffer,
        width: number,
        height: number,
        pixelFormat: string,
        windowCenter?: number,
        windowWidth?: number
    ): Promise<RenderResult> {
        const data: RenderRawPixelsData = {
            rawData,
            width,
            height,
            pixelFormat,
            windowCenter,
            windowWidth
        };

        return this.sendMessage('RENDER_RAW_PIXELS', data);
    }

    /**
     * Apply windowing to pixel data
     * @param pixelData - Raw pixel data
     * @param windowCenter - Window center value
     * @param windowWidth - Window width value
     * @returns Promise<Uint8ClampedArray> - Windowed pixel data
     */
    async applyWindowing(
        pixelData: Uint16Array,
        windowCenter: number,
        windowWidth: number
    ): Promise<Uint8ClampedArray> {
        return this.sendMessage('APPLY_WINDOWING', {
            pixelData,
            windowCenter,
            windowWidth
        });
    }

    /**
     * Process raw pixel data without rendering to canvas
     * @param rawData - Raw pixel data from server
     * @param width - Image width
     * @param height - Image height
     * @param pixelFormat - Pixel format
     * @param windowCenter - Optional window center
     * @param windowWidth - Optional window width
     * @returns Promise<ImageData> - Processed image data
     */
    async processPixelData(
        rawData: ArrayBuffer,
        width: number,
        height: number,
        pixelFormat: string,
        windowCenter?: number,
        windowWidth?: number
    ): Promise<ImageData> {
        return this.sendMessage('PROCESS_PIXEL_DATA', {
            rawData,
            width,
            height,
            pixelFormat,
            windowCenter,
            windowWidth
        });
    }

    /**
     * Check if the worker is ready
     */
    isWorkerReady(): boolean {
        return this.isReady && this.worker !== null;
    }

    /**
     * Terminate the worker
     */
    terminate(): void {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.isReady = false;
            
            // Reject all pending messages
            this.pendingMessages.forEach(({ reject }) => {
                reject(new Error('Worker terminated'));
            });
            this.pendingMessages.clear();
        }
    }
}

// Singleton instance
let workerServiceInstance: DicomWorkerService | null = null;

/**
 * Get the singleton instance of DicomWorkerService
 */
export function getDicomWorkerService(): DicomWorkerService {
    if (!workerServiceInstance) {
        workerServiceInstance = new DicomWorkerService();
    }
    return workerServiceInstance;
}

/**
 * Cleanup the worker service (useful for testing or cleanup)
 */
export function cleanupDicomWorkerService(): void {
    if (workerServiceInstance) {
        workerServiceInstance.terminate();
        workerServiceInstance = null;
    }
}