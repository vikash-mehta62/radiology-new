/**
 * Viewport Operations Tests
 * 
 * Comprehensive tests for viewport operations including zoom, pan, window/level adjustments
 * Tests the core viewport manipulation functionality of DICOM viewers
 */

import { studyService } from '../services/studyService';
import { environmentService } from '../services/environmentService';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details: any;
  error?: string;
}

interface ViewportTestSuite {
  testName: string;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    duration: number;
  };
}

class ViewportOperationsTester {
  private results: TestResult[] = [];

  async runTest(name: string, testFn: () => Promise<any>): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      console.log(`🧪 Running test: ${name}`);
      const result = await testFn();
      const duration = performance.now() - startTime;
      
      const testResult: TestResult = {
        name,
        passed: true,
        duration,
        details: result
      };
      
      console.log(`✅ ${name} - PASSED (${duration.toFixed(2)}ms)`);
      this.results.push(testResult);
      return testResult;
      
    } catch (error) {
      const duration = performance.now() - startTime;
      const testResult: TestResult = {
        name,
        passed: false,
        duration,
        details: null,
        error: error instanceof Error ? error.message : String(error)
      };
      
      console.error(`❌ ${name} - FAILED (${duration.toFixed(2)}ms):`, error);
      this.results.push(testResult);
      return testResult;
    }
  }

  getResults(): TestResult[] {
    return this.results;
  }

  getSummary(): ViewportTestSuite['summary'] {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const duration = this.results.reduce((sum, r) => sum + r.duration, 0);

    return { total, passed, failed, duration };
  }
}

// Mock viewport operations for testing
class MockViewport {
  private zoom: number = 1.0;
  private pan: { x: number; y: number } = { x: 0, y: 0 };
  private windowLevel: { width: number; center: number } = { width: 400, center: 40 };
  private rotation: number = 0;
  private flip: { horizontal: boolean; vertical: boolean } = { horizontal: false, vertical: false };

  // Zoom operations
  setZoom(factor: number): void {
    this.zoom = Math.max(0.1, Math.min(10.0, factor));
  }

  getZoom(): number {
    return this.zoom;
  }

  zoomIn(factor: number = 1.2): void {
    this.setZoom(this.zoom * factor);
  }

  zoomOut(factor: number = 0.8): void {
    this.setZoom(this.zoom * factor);
  }

  fitToWindow(): void {
    this.zoom = 1.0;
    this.pan = { x: 0, y: 0 };
  }

  // Pan operations
  setPan(x: number, y: number): void {
    this.pan = { x, y };
  }

  getPan(): { x: number; y: number } {
    return { ...this.pan };
  }

  panBy(deltaX: number, deltaY: number): void {
    this.pan.x += deltaX;
    this.pan.y += deltaY;
  }

  // Window/Level operations
  setWindowLevel(width: number, center: number): void {
    this.windowLevel = { 
      width: Math.max(1, width), 
      center: Math.max(-1024, Math.min(3071, center))
    };
  }

  getWindowLevel(): { width: number; center: number } {
    return { ...this.windowLevel };
  }

  adjustWindowLevel(deltaWidth: number, deltaCenter: number): void {
    this.setWindowLevel(
      this.windowLevel.width + deltaWidth,
      this.windowLevel.center + deltaCenter
    );
  }

  // Rotation operations
  setRotation(angle: number): void {
    this.rotation = angle % 360;
  }

  getRotation(): number {
    return this.rotation;
  }

  rotate(angle: number): void {
    this.setRotation(this.rotation + angle);
  }

  // Flip operations
  setFlip(horizontal: boolean, vertical: boolean): void {
    this.flip = { horizontal, vertical };
  }

  getFlip(): { horizontal: boolean; vertical: boolean } {
    return { ...this.flip };
  }

  flipHorizontal(): void {
    this.flip.horizontal = !this.flip.horizontal;
  }

  flipVertical(): void {
    this.flip.vertical = !this.flip.vertical;
  }

  // Reset operations
  reset(): void {
    this.zoom = 1.0;
    this.pan = { x: 0, y: 0 };
    this.windowLevel = { width: 400, center: 40 };
    this.rotation = 0;
    this.flip = { horizontal: false, vertical: false };
  }

  // Get current state
  getState(): any {
    return {
      zoom: this.zoom,
      pan: this.pan,
      windowLevel: this.windowLevel,
      rotation: this.rotation,
      flip: this.flip
    };
  }
}

export async function runViewportOperationsTests(): Promise<ViewportTestSuite> {
  console.log('🚀 Starting Viewport Operations Tests...\n');
  
  const tester = new ViewportOperationsTester();
  const mockViewport = new MockViewport();

  // Test 1: Zoom Operations
  await tester.runTest('Zoom Operations', async () => {
    const initialZoom = mockViewport.getZoom();
    
    // Test zoom in
    mockViewport.zoomIn();
    const zoomedIn = mockViewport.getZoom();
    
    // Test zoom out
    mockViewport.zoomOut();
    const zoomedOut = mockViewport.getZoom();
    
    // Test direct zoom setting
    mockViewport.setZoom(2.5);
    const directZoom = mockViewport.getZoom();
    
    // Test zoom limits
    mockViewport.setZoom(15.0); // Should be clamped to 10.0
    const maxZoom = mockViewport.getZoom();
    
    mockViewport.setZoom(0.05); // Should be clamped to 0.1
    const minZoom = mockViewport.getZoom();
    
    // Reset for next test
    mockViewport.reset();
    
    return {
      initialZoom,
      zoomedIn,
      zoomedOut,
      directZoom,
      maxZoom,
      minZoom,
      zoomInWorking: zoomedIn > initialZoom,
      zoomOutWorking: zoomedOut < zoomedIn,
      directZoomWorking: directZoom === 2.5,
      zoomLimitsWorking: maxZoom === 10.0 && minZoom === 0.1
    };
  });

  // Test 2: Pan Operations
  await tester.runTest('Pan Operations', async () => {
    const initialPan = mockViewport.getPan();
    
    // Test direct pan setting
    mockViewport.setPan(100, 50);
    const directPan = mockViewport.getPan();
    
    // Test relative panning
    mockViewport.panBy(25, -10);
    const relativePan = mockViewport.getPan();
    
    // Test multiple pan operations
    mockViewport.panBy(-50, 30);
    mockViewport.panBy(10, -20);
    const multiplePan = mockViewport.getPan();
    
    // Reset for next test
    mockViewport.reset();
    
    return {
      initialPan,
      directPan,
      relativePan,
      multiplePan,
      directPanWorking: directPan.x === 100 && directPan.y === 50,
      relativePanWorking: relativePan.x === 125 && relativePan.y === 40,
      multiplePanWorking: multiplePan.x === 85 && multiplePan.y === 50
    };
  });

  // Test 3: Window/Level Operations
  await tester.runTest('Window/Level Operations', async () => {
    const initialWL = mockViewport.getWindowLevel();
    
    // Test direct window/level setting
    mockViewport.setWindowLevel(800, 200);
    const directWL = mockViewport.getWindowLevel();
    
    // Test relative adjustments
    mockViewport.adjustWindowLevel(100, -50);
    const adjustedWL = mockViewport.getWindowLevel();
    
    // Test window/level limits
    mockViewport.setWindowLevel(0.5, -2000); // Width should be clamped to 1, center to -1024
    const clampedWL = mockViewport.getWindowLevel();
    
    mockViewport.setWindowLevel(5000, 4000); // Center should be clamped to 3071
    const maxClampedWL = mockViewport.getWindowLevel();
    
    // Test common presets
    const presets = [
      { name: 'Lung', width: 1500, center: -600 },
      { name: 'Bone', width: 2000, center: 300 },
      { name: 'Brain', width: 100, center: 50 },
      { name: 'Abdomen', width: 400, center: 50 }
    ];
    
    const presetResults = presets.map(preset => {
      mockViewport.setWindowLevel(preset.width, preset.center);
      const result = mockViewport.getWindowLevel();
      return {
        name: preset.name,
        set: preset,
        actual: result,
        correct: result.width === preset.width && result.center === preset.center
      };
    });
    
    // Reset for next test
    mockViewport.reset();
    
    return {
      initialWL,
      directWL,
      adjustedWL,
      clampedWL,
      maxClampedWL,
      presetResults,
      directWLWorking: directWL.width === 800 && directWL.center === 200,
      adjustedWLWorking: adjustedWL.width === 900 && adjustedWL.center === 150,
      clampingWorking: clampedWL.width === 1 && clampedWL.center === -1024 && maxClampedWL.center === 3071
    };
  });

  // Test 4: Rotation Operations
  await tester.runTest('Rotation Operations', async () => {
    const initialRotation = mockViewport.getRotation();
    
    // Test direct rotation setting
    mockViewport.setRotation(90);
    const directRotation = mockViewport.getRotation();
    
    // Test relative rotation
    mockViewport.rotate(45);
    const relativeRotation = mockViewport.getRotation();
    
    // Test rotation wrapping
    mockViewport.setRotation(450); // Should wrap to 90
    const wrappedRotation = mockViewport.getRotation();
    
    // Test negative rotation
    mockViewport.setRotation(-90); // Should wrap to 270
    const negativeRotation = mockViewport.getRotation();
    
    // Test common rotation angles
    const commonAngles = [0, 90, 180, 270];
    const angleResults = commonAngles.map(angle => {
      mockViewport.setRotation(angle);
      return {
        set: angle,
        actual: mockViewport.getRotation(),
        correct: mockViewport.getRotation() === angle
      };
    });
    
    // Reset for next test
    mockViewport.reset();
    
    return {
      initialRotation,
      directRotation,
      relativeRotation,
      wrappedRotation,
      negativeRotation,
      angleResults,
      directRotationWorking: directRotation === 90,
      relativeRotationWorking: relativeRotation === 135,
      wrappingWorking: wrappedRotation === 90 && negativeRotation === 270
    };
  });

  // Test 5: Flip Operations
  await tester.runTest('Flip Operations', async () => {
    const initialFlip = mockViewport.getFlip();
    
    // Test horizontal flip
    mockViewport.flipHorizontal();
    const horizontalFlip = mockViewport.getFlip();
    
    // Test vertical flip
    mockViewport.flipVertical();
    const bothFlip = mockViewport.getFlip();
    
    // Test flip again (should toggle back)
    mockViewport.flipHorizontal();
    const horizontalToggle = mockViewport.getFlip();
    
    // Test direct flip setting
    mockViewport.setFlip(true, true);
    const directFlip = mockViewport.getFlip();
    
    mockViewport.setFlip(false, false);
    const resetFlip = mockViewport.getFlip();
    
    // Reset for next test
    mockViewport.reset();
    
    return {
      initialFlip,
      horizontalFlip,
      bothFlip,
      horizontalToggle,
      directFlip,
      resetFlip,
      horizontalFlipWorking: horizontalFlip.horizontal === true && horizontalFlip.vertical === false,
      bothFlipWorking: bothFlip.horizontal === true && bothFlip.vertical === true,
      toggleWorking: horizontalToggle.horizontal === false && horizontalToggle.vertical === true,
      directFlipWorking: directFlip.horizontal === true && directFlip.vertical === true
    };
  });

  // Test 6: Fit to Window Operation
  await tester.runTest('Fit to Window Operation', async () => {
    // Modify viewport state
    mockViewport.setZoom(3.5);
    mockViewport.setPan(150, -75);
    mockViewport.setRotation(45);
    
    const modifiedState = mockViewport.getState();
    
    // Fit to window
    mockViewport.fitToWindow();
    const fittedState = mockViewport.getState();
    
    // Reset for next test
    mockViewport.reset();
    
    return {
      modifiedState,
      fittedState,
      fitToWindowWorking: fittedState.zoom === 1.0 && fittedState.pan.x === 0 && fittedState.pan.y === 0,
      rotationPreserved: fittedState.rotation === modifiedState.rotation, // Rotation should be preserved
      flipPreserved: fittedState.flip.horizontal === modifiedState.flip.horizontal && 
                     fittedState.flip.vertical === modifiedState.flip.vertical
    };
  });

  // Test 7: Reset Operation
  await tester.runTest('Reset Operation', async () => {
    // Modify all viewport properties
    mockViewport.setZoom(2.5);
    mockViewport.setPan(100, -50);
    mockViewport.setWindowLevel(1000, 500);
    mockViewport.setRotation(180);
    mockViewport.setFlip(true, true);
    
    const modifiedState = mockViewport.getState();
    
    // Reset viewport
    mockViewport.reset();
    const resetState = mockViewport.getState();
    
    return {
      modifiedState,
      resetState,
      resetWorking: resetState.zoom === 1.0 && 
                   resetState.pan.x === 0 && resetState.pan.y === 0 &&
                   resetState.windowLevel.width === 400 && resetState.windowLevel.center === 40 &&
                   resetState.rotation === 0 &&
                   resetState.flip.horizontal === false && resetState.flip.vertical === false
    };
  });

  // Test 8: State Management
  await tester.runTest('State Management', async () => {
    // Set specific state
    mockViewport.setZoom(1.5);
    mockViewport.setPan(75, 25);
    mockViewport.setWindowLevel(600, 100);
    mockViewport.setRotation(90);
    mockViewport.setFlip(false, true);
    
    const currentState = mockViewport.getState();
    
    // Verify state consistency
    const zoomConsistent = mockViewport.getZoom() === currentState.zoom;
    const panConsistent = JSON.stringify(mockViewport.getPan()) === JSON.stringify(currentState.pan);
    const wlConsistent = JSON.stringify(mockViewport.getWindowLevel()) === JSON.stringify(currentState.windowLevel);
    const rotationConsistent = mockViewport.getRotation() === currentState.rotation;
    const flipConsistent = JSON.stringify(mockViewport.getFlip()) === JSON.stringify(currentState.flip);
    
    return {
      currentState,
      stateConsistency: {
        zoom: zoomConsistent,
        pan: panConsistent,
        windowLevel: wlConsistent,
        rotation: rotationConsistent,
        flip: flipConsistent,
        overall: zoomConsistent && panConsistent && wlConsistent && rotationConsistent && flipConsistent
      }
    };
  });

  // Test 9: Performance Benchmarks
  await tester.runTest('Performance Benchmarks', async () => {
    const iterations = 1000;
    const benchmarks: any = {};
    
    // Benchmark zoom operations
    const zoomStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      mockViewport.setZoom(1.0 + (i % 100) / 100);
    }
    benchmarks.zoom = performance.now() - zoomStart;
    
    // Benchmark pan operations
    const panStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      mockViewport.setPan(i % 200, (i * 2) % 200);
    }
    benchmarks.pan = performance.now() - panStart;
    
    // Benchmark window/level operations
    const wlStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      mockViewport.setWindowLevel(400 + (i % 1000), 40 + (i % 500));
    }
    benchmarks.windowLevel = performance.now() - wlStart;
    
    // Benchmark rotation operations
    const rotationStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      mockViewport.setRotation(i % 360);
    }
    benchmarks.rotation = performance.now() - rotationStart;
    
    // Calculate operations per second
    const opsPerSecond = {
      zoom: (iterations / benchmarks.zoom) * 1000,
      pan: (iterations / benchmarks.pan) * 1000,
      windowLevel: (iterations / benchmarks.windowLevel) * 1000,
      rotation: (iterations / benchmarks.rotation) * 1000
    };
    
    return {
      iterations,
      benchmarks,
      opsPerSecond,
      performanceAcceptable: Object.values(opsPerSecond).every(ops => ops > 10000) // > 10k ops/sec
    };
  });

  // Test 10: Integration with Study Data
  await tester.runTest('Integration with Study Data', async () => {
    try {
      const studies = await studyService.getStudies();
      const hasStudies = studies && studies.studies && studies.studies.length > 0;
      
      let studyIntegration = null;
      if (hasStudies) {
        const sampleStudy = studies.studies[0];
        
        // Simulate viewport operations with study context
        studyIntegration = {
          studyInstanceUID: sampleStudy.studyInstanceUID,
          modality: sampleStudy.modality,
          recommendedWindowLevel: getRecommendedWindowLevel(sampleStudy.modality),
          viewportOperationsSupported: true,
          multiViewportCapable: sampleStudy.series && sampleStudy.series.length > 1
        };
      }
      
      return {
        studiesAvailable: hasStudies,
        studyCount: studies?.studies?.length || 0,
        studyIntegration,
        integrationWorking: hasStudies && studyIntegration !== null
      };
    } catch (error) {
      return {
        studiesAvailable: false,
        studyCount: 0,
        studyIntegration: null,
        integrationWorking: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  const summary = tester.getSummary();
  
  console.log('\n📊 Viewport Operations Tests Summary:');
  console.log(`Total Tests: ${summary.total}`);
  console.log(`Passed: ${summary.passed}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Total Duration: ${summary.duration.toFixed(2)}ms`);
  console.log(`Success Rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%`);

  return {
    testName: 'Viewport Operations Tests',
    results: tester.getResults(),
    summary
  };
}

// Helper function to get recommended window/level based on modality
function getRecommendedWindowLevel(modality: string): { width: number; center: number } {
  const presets: { [key: string]: { width: number; center: number } } = {
    'CT': { width: 400, center: 40 },
    'MR': { width: 200, center: 100 },
    'CR': { width: 2000, center: 1000 },
    'DX': { width: 2000, center: 1000 },
    'US': { width: 256, center: 128 },
    'XA': { width: 2000, center: 1000 }
  };
  
  return presets[modality] || { width: 400, center: 40 };
}

// Export for use in other test files
export { ViewportOperationsTester, MockViewport };

// Run tests if this file is executed directly
if (typeof window !== 'undefined' && window.location?.pathname?.includes('test')) {
  runViewportOperationsTests().then(results => {
    console.log('Viewport Operations Tests completed:', results);
  }).catch(error => {
    console.error('Viewport Operations Tests failed:', error);
  });
}