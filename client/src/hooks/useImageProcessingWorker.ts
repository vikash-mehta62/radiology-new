import { useRef, useCallback, useEffect, useState } from 'react';

/**
 * Task interface for image processing
 */
export interface ImageProcessingTask {
  id: string;
  type: 'windowingAdjustment' | 'imageEnhancement' | 'histogramCalculation' | 
        'imageCompression' | 'noiseReduction' | 'edgeDetection' | 'volumeRendering';
  data: any;
  priority?: 'low' | 'medium' | 'high';
}

/**
 * Task result interface
 */
export interface TaskResult {
  taskId: string;
  result: any;
  processingTime: number;
}

/**
 * Worker statistics interface
 */
export interface WorkerStats {
  tasksProcessed: number;
  averageProcessingTime: number;
  totalProcessingTime: number;
  errors: number;
  queueLength: number;
  isProcessing: boolean;
}

/**
 * Hook for managing image processing Web Worker
 */
export const useImageProcessingWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const taskCallbacksRef = useRef<Map<string, (result: any, error?: string) => void>>(new Map());
  const [isInitialized, setIsInitialized] = useState(false);
  const [stats, setStats] = useState<WorkerStats | null>(null);

  /**
   * Initialize the Web Worker
   */
  const initializeWorker = useCallback(() => {
    if (workerRef.current || isInitialized) return;

    try {
      // Create worker from public directory
      workerRef.current = new Worker('/workers/imageProcessingWorker.js');
      
      // Set up message handler
      workerRef.current.onmessage = (event) => {
        const { type, taskId, result, error, stats: workerStats } = event.data;
        
        switch (type) {
          case 'initialized':
            setIsInitialized(true);
            console.log('🔧 [useImageProcessingWorker] Worker initialized');
            break;
          
          case 'taskComplete':
            const successCallback = taskCallbacksRef.current.get(taskId);
            if (successCallback) {
              successCallback(result);
              taskCallbacksRef.current.delete(taskId);
            }
            break;
          
          case 'taskError':
            const errorCallback = taskCallbacksRef.current.get(taskId);
            if (errorCallback) {
              errorCallback(null, error);
              taskCallbacksRef.current.delete(taskId);
            }
            break;
          
          case 'stats':
            setStats(workerStats);
            break;
          
          case 'queueCleared':
            console.log('🔧 [useImageProcessingWorker] Queue cleared');
            break;
          
          case 'workerError':
            console.error('🔧 [useImageProcessingWorker] Worker error:', error);
            break;
          
          default:
            console.warn('🔧 [useImageProcessingWorker] Unknown message type:', type);
        }
      };

      // Set up error handler
      workerRef.current.onerror = (error) => {
        console.error('🔧 [useImageProcessingWorker] Worker error:', error);
        setIsInitialized(false);
      };

      // Initialize the worker
      workerRef.current.postMessage({ type: 'initialize' });
      
    } catch (error) {
      console.error('🔧 [useImageProcessingWorker] Failed to create worker:', error);
    }
  }, [isInitialized]);

  /**
   * Process a task using the Web Worker
   */
  const processTask = useCallback(async (task: ImageProcessingTask): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current || !isInitialized) {
        reject(new Error('Worker not initialized'));
        return;
      }

      // Generate unique task ID
      const taskId = `${task.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store callback for this task
      taskCallbacksRef.current.set(taskId, (result, error) => {
        if (error) {
          reject(new Error(error));
        } else {
          resolve(result);
        }
      });

      // Send task to worker
      workerRef.current.postMessage({
        type: 'addTask',
        data: {
          ...task,
          id: taskId
        }
      });
    });
  }, [isInitialized]);

  /**
   * Process windowing adjustment
   */
  const processWindowing = useCallback(async (
    imageData: ImageData,
    windowCenter: number,
    windowWidth: number,
    invert: boolean = false
  ) => {
    return processTask({
      id: '',
      type: 'windowingAdjustment',
      data: { imageData, windowCenter, windowWidth, invert }
    });
  }, [processTask]);

  /**
   * Process image enhancement
   */
  const processImageEnhancement = useCallback(async (
    imageData: ImageData,
    brightness: number = 0,
    contrast: number = 1,
    gamma: number = 1
  ) => {
    return processTask({
      id: '',
      type: 'imageEnhancement',
      data: { imageData, brightness, contrast, gamma }
    });
  }, [processTask]);

  /**
   * Calculate histogram
   */
  const calculateHistogram = useCallback(async (
    imageData: ImageData,
    bins: number = 256
  ) => {
    return processTask({
      id: '',
      type: 'histogramCalculation',
      data: { imageData, bins }
    });
  }, [processTask]);

  /**
   * Compress image
   */
  const compressImage = useCallback(async (
    imageData: ImageData,
    quality: number = 0.8,
    format: string = 'jpeg'
  ) => {
    return processTask({
      id: '',
      type: 'imageCompression',
      data: { imageData, quality, format }
    });
  }, [processTask]);

  /**
   * Reduce noise
   */
  const reduceNoise = useCallback(async (
    imageData: ImageData,
    filterSize: number = 3
  ) => {
    return processTask({
      id: '',
      type: 'noiseReduction',
      data: { imageData, filterSize }
    });
  }, [processTask]);

  /**
   * Detect edges
   */
  const detectEdges = useCallback(async (
    imageData: ImageData,
    threshold: number = 100
  ) => {
    return processTask({
      id: '',
      type: 'edgeDetection',
      data: { imageData, threshold }
    });
  }, [processTask]);

  /**
   * Process volume data
   */
  const processVolumeData = useCallback(async (
    volumeData: any,
    transferFunction: any,
    renderingParams: any
  ) => {
    return processTask({
      id: '',
      type: 'volumeRendering',
      data: { volumeData, transferFunction, renderingParams }
    });
  }, [processTask]);

  /**
   * Get worker statistics
   */
  const getStats = useCallback(() => {
    if (workerRef.current && isInitialized) {
      workerRef.current.postMessage({ type: 'getStats' });
    }
  }, [isInitialized]);

  /**
   * Clear processing queue
   */
  const clearQueue = useCallback(() => {
    if (workerRef.current && isInitialized) {
      workerRef.current.postMessage({ type: 'clearQueue' });
      taskCallbacksRef.current.clear();
    }
  }, [isInitialized]);

  /**
   * Terminate the worker
   */
  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setIsInitialized(false);
      taskCallbacksRef.current.clear();
      console.log('🔧 [useImageProcessingWorker] Worker terminated');
    }
  }, []);

  // Initialize worker on mount
  useEffect(() => {
    initializeWorker();
    
    // Cleanup on unmount
    return () => {
      terminateWorker();
    };
  }, [initializeWorker, terminateWorker]);

  // Periodically get stats
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(() => {
      getStats();
    }, 5000); // Update stats every 5 seconds

    return () => clearInterval(interval);
  }, [isInitialized, getStats]);

  return {
    isInitialized,
    stats,
    processTask,
    processWindowing,
    processImageEnhancement,
    calculateHistogram,
    compressImage,
    reduceNoise,
    detectEdges,
    processVolumeData,
    getStats,
    clearQueue,
    terminateWorker
  };
};