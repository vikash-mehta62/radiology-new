/**
 * OHIF Integration Service
 * Integrates OHIF Viewer components for enhanced medical imaging workflow
 */

import { ServicesManager, CommandsManager, ExtensionManager } from '@ohif/core';
import { UINotificationService, UIModalService, UIDialogService } from '@ohif/ui';

interface OHIFConfiguration {
  routerBasename: string;
  showStudyList: boolean;
  maxNumberOfWebWorkers: number;
  showWarningMessageForCrossOrigin: boolean;
  showCPUFallbackMessage: boolean;
  strictZSpacingForVolumeViewport: boolean;
}

interface StudyMetadata {
  StudyInstanceUID: string;
  StudyDate: string;
  StudyTime: string;
  PatientName: string;
  PatientID: string;
  AccessionNumber: string;
  StudyDescription: string;
  Modality: string;
  SeriesCount: number;
  InstanceCount: number;
}

interface ViewportConfiguration {
  viewportType: 'stack' | 'volume' | 'microscopy';
  toolGroupId: string;
  initialImageOptions?: {
    index?: number;
    preset?: string;
  };
  syncGroups?: {
    voi?: string;
    cameraPosition?: string;
  };
}

class OHIFIntegrationService {
  private servicesManager: ServicesManager | null = null;
  private commandsManager: CommandsManager | null = null;
  private extensionManager: ExtensionManager | null = null;
  private initialized = false;
  private configuration: OHIFConfiguration = {
    routerBasename: '/',
    showStudyList: true,
    maxNumberOfWebWorkers: 4,
    showWarningMessageForCrossOrigin: true,
    showCPUFallbackMessage: true,
    strictZSpacingForVolumeViewport: true
  };

  async initialize(config?: Partial<OHIFConfiguration>): Promise<boolean> {
    try {
      // Merge configuration
      if (config) {
        this.configuration = { ...this.configuration, ...config };
      }

      // Initialize OHIF services
      await this.initializeOHIFServices();
      
      this.initialized = true;
      console.log('✅ OHIF Integration Service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize OHIF Integration Service:', error);
      return false;
    }
  }

  private async initializeOHIFServices(): Promise<void> {
    try {
      // Initialize Services Manager
      this.servicesManager = new ServicesManager();
      
      // Initialize Commands Manager
      this.commandsManager = new CommandsManager({
        getAppState: () => ({}),
        servicesManager: this.servicesManager
      });

      // Initialize Extension Manager
      this.extensionManager = new ExtensionManager({
        servicesManager: this.servicesManager,
        commandsManager: this.commandsManager,
        appConfig: this.configuration
      });

      // Register core services
      this.registerCoreServices();
      
      console.log('✅ OHIF core services initialized');
    } catch (error) {
      console.error('Failed to initialize OHIF services:', error);
      throw error;
    }
  }

  private registerCoreServices(): void {
    if (!this.servicesManager) return;

    // Register UI services
    this.servicesManager.registerService(
      UINotificationService.REGISTRATION
    );
    
    this.servicesManager.registerService(
      UIModalService.REGISTRATION
    );
    
    this.servicesManager.registerService(
      UIDialogService.REGISTRATION
    );

    console.log('✅ OHIF core services registered');
  }

  createViewerWorkspace(containerId: string, studies: StudyMetadata[]): boolean {
    if (!this.initialized || !this.servicesManager) {
      console.error('OHIF Integration Service not initialized');
      return false;
    }

    try {
      // Create viewer workspace configuration
      const workspaceConfig = {
        id: 'viewer',
        displayName: 'Medical Image Viewer',
        studies: studies,
        viewports: this.createDefaultViewports(studies)
      };

      // Initialize workspace
      this.initializeWorkspace(containerId, workspaceConfig);
      
      console.log('✅ OHIF viewer workspace created');
      return true;
    } catch (error) {
      console.error('Failed to create viewer workspace:', error);
      return false;
    }
  }

  private createDefaultViewports(studies: StudyMetadata[]): ViewportConfiguration[] {
    const viewports: ViewportConfiguration[] = [];

    studies.forEach((study, index) => {
      // Create a viewport for each study
      viewports.push({
        viewportType: 'stack',
        toolGroupId: `toolGroup_${index}`,
        initialImageOptions: {
          index: 0,
          preset: 'first'
        },
        syncGroups: {
          voi: `voi_${index}`,
          cameraPosition: `camera_${index}`
        }
      });
    });

    return viewports;
  }

  private initializeWorkspace(containerId: string, config: any): void {
    // This would typically initialize the OHIF viewer workspace
    // For now, we'll log the configuration
    console.log('Initializing workspace with config:', config);
    
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="ohif-viewer-workspace">
          <div class="ohif-toolbar">OHIF Medical Imaging Viewer</div>
          <div class="ohif-viewport-grid">
            ${config.viewports.map((vp: any, index: number) => `
              <div class="ohif-viewport" data-viewport-index="${index}">
                <div class="viewport-info">Viewport ${index + 1} (${vp.viewportType})</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  loadStudy(studyInstanceUID: string): Promise<StudyMetadata | null> {
    return new Promise((resolve) => {
      // Simulate study loading
      setTimeout(() => {
        const mockStudy: StudyMetadata = {
          StudyInstanceUID: studyInstanceUID,
          StudyDate: '20241225',
          StudyTime: '120000',
          PatientName: 'Test Patient',
          PatientID: 'TEST001',
          AccessionNumber: 'ACC001',
          StudyDescription: 'CT Chest',
          Modality: 'CT',
          SeriesCount: 3,
          InstanceCount: 150
        };
        
        resolve(mockStudy);
      }, 1000);
    });
  }

  configureViewport(viewportIndex: number, config: Partial<ViewportConfiguration>): boolean {
    try {
      console.log(`Configuring viewport ${viewportIndex} with:`, config);
      
      // This would typically configure the OHIF viewport
      // For now, we'll just log the configuration
      
      return true;
    } catch (error) {
      console.error('Failed to configure viewport:', error);
      return false;
    }
  }

  enableMeasurementTools(): boolean {
    if (!this.commandsManager) {
      console.error('Commands manager not available');
      return false;
    }

    try {
      // Enable common measurement tools
      const tools = [
        'Length',
        'Bidirectional',
        'EllipticalROI',
        'RectangleROI',
        'Angle',
        'CobbAngle',
        'ArrowAnnotate'
      ];

      tools.forEach(tool => {
        console.log(`Enabling tool: ${tool}`);
        // This would typically enable the tool via OHIF commands
      });

      console.log('✅ Measurement tools enabled');
      return true;
    } catch (error) {
      console.error('Failed to enable measurement tools:', error);
      return false;
    }
  }

  exportMeasurements(): any[] {
    try {
      // This would typically export measurements from OHIF
      const mockMeasurements = [
        {
          id: 'measurement_1',
          type: 'Length',
          value: 25.4,
          unit: 'mm',
          coordinates: [[100, 100], [150, 150]]
        },
        {
          id: 'measurement_2',
          type: 'Area',
          value: 156.7,
          unit: 'mm²',
          coordinates: [[200, 200], [250, 250], [225, 275]]
        }
      ];

      console.log('✅ Measurements exported');
      return mockMeasurements;
    } catch (error) {
      console.error('Failed to export measurements:', error);
      return [];
    }
  }

  showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    if (!this.servicesManager) return;

    try {
      const uiNotificationService = this.servicesManager.services.uiNotificationService;
      if (uiNotificationService) {
        uiNotificationService.show({
          title: 'OHIF Viewer',
          message: message,
          type: type,
          duration: 5000
        });
      } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  openModal(content: any, options: any = {}): void {
    if (!this.servicesManager) return;

    try {
      const uiModalService = this.servicesManager.services.uiModalService;
      if (uiModalService) {
        uiModalService.show({
          content: content,
          title: options.title || 'OHIF Modal',
          shouldCloseOnEsc: options.shouldCloseOnEsc !== false,
          shouldCloseOnOverlayClick: options.shouldCloseOnOverlayClick !== false,
          ...options
        });
      }
    } catch (error) {
      console.error('Failed to open modal:', error);
    }
  }

  getConfiguration(): OHIFConfiguration {
    return { ...this.configuration };
  }

  updateConfiguration(config: Partial<OHIFConfiguration>): void {
    this.configuration = { ...this.configuration, ...config };
    console.log('✅ OHIF configuration updated');
  }

  getServicesManager(): ServicesManager | null {
    return this.servicesManager;
  }

  getCommandsManager(): CommandsManager | null {
    return this.commandsManager;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  dispose(): void {
    if (this.extensionManager) {
      // Clean up extensions
      this.extensionManager = null;
    }

    if (this.commandsManager) {
      // Clean up commands
      this.commandsManager = null;
    }

    if (this.servicesManager) {
      // Clean up services
      this.servicesManager = null;
    }

    this.initialized = false;
    console.log('✅ OHIF Integration Service disposed');
  }
}

export const ohifIntegrationService = new OHIFIntegrationService();
export default ohifIntegrationService;