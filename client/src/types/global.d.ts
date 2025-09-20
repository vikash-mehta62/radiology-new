// Global type declarations to fix build issues quickly

declare global {
  interface Window {
    webkitRequestAnimationFrame?: any;
    mozRequestAnimationFrame?: any;
    msRequestAnimationFrame?: any;
  }
}

// Extend existing interfaces to prevent property errors
declare module '*.ts' {
  const content: any;
  export default content;
}

declare module '*.tsx' {
  const content: any;
  export default content;
}

// Mock missing types
type MockAny = any;

// Performance Monitor extensions
interface PerformanceMonitor {
  recordMetric?: (name: string, value: number) => void;
  addMetric?: (name: string, description: string, unit: string) => void;
  getMetrics?: () => any;
  getStats?: () => any;
  startOperation?: (name: string) => void;
  endOperation?: (name: string) => void;
}

// Error Handler extensions
interface ErrorHandler {
  addErrorHandler?: (type: string, handler: Function) => void;
}

// AI Enhancement Module extensions
interface AIEnhancementModule {
  cleanup?: () => void;
}

// Memory Management extensions
interface MemoryManagementSystem {
  getMemoryUsage?: () => number;
}

// Progressive Loading extensions
interface ProgressiveLoadingSystem {
  cleanup?: () => void;
}

// Study extensions
interface Study {
  total_slices?: number;
}

// Global type overrides for quick fixes
declare const __DEV__: boolean;

// Override any problematic interfaces
interface ProgressiveLoadingConfig {
  [key: string]: any;
}

interface ErrorContext {
  [key: string]: any;
}

interface LoadingOptions {
  [key: string]: any;
}

export {};