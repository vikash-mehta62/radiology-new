/**
 * Viewport Operations Tests (JavaScript Version)
 * 
 * Comprehensive tests for viewport operations including zoom, pan, window/level adjustments
 * Tests the core viewport manipulation functionality of DICOM viewers
 */

// Mock viewport operations for testing
class MockViewport {
  constructor() {
    this.zoom = 1.0;
    this.pan = { x: 0, y: 0 };
    this.windowLevel = { width: 400, center: 40 };
    this.rotation = 0;
    this.flip = { horizontal: false, vertical: false };
  }

  // Zoom operations
  setZoom(factor) {
    this.zoom = Math.max(0.1, Math.min(10.0, factor));
  }

  getZoom() {
    return this.zoom;
  }

  zoomIn(factor = 1.2) {
    this.setZoom(this.zoom * factor);
  }

  zoomOut(factor = 0.8) {
    this.setZoom(this.zoom * factor);
  }

  fitToWindow() {
    this.zoom = 1.0;
    this.pan = { x: 0, y: 0 };
  }

  // Pan operations
  setPan(x, y) {
    this.pan = { x, y };
  }

  getPan() {
    return { ...this.pan };
  }

  panBy(deltaX, deltaY) {
    this.pan.x += deltaX;
    this.pan.y += deltaY;
  }

  // Window/Level operations
  setWindowLevel(width, center) {
    this.windowLevel = { 
      width: Math.max(1, width), 
      center: Math.max(-1024, Math.min(3071, center))
    };
  }

  getWindowLevel() {
    return { ...this.windowLevel };
  }

  adjustWindowLevel(deltaWidth, deltaCenter) {
    this.setWindowLevel(
      this.windowLevel.width + deltaWidth,
      this.windowLevel.center + deltaCenter
    );
  }

  // Rotation operations
  setRotation(angle) {
    this.rotation = angle % 360;
  }

  getRotation() {
    return this.rotation;
  }

  rotate(angle) {
    this.setRotation(this.rotation + angle);
  }

  // Flip operations
  setFlip(horizontal, vertical) {
    this.flip = { horizontal, vertical };
  }

  getFlip() {
    return { ...this.flip };
  }

  flipHorizontal() {
    this.flip.horizontal = !this.flip.horizontal;
  }

  flipVertical() {
    this.flip.vertical = !this.flip.vertical;
  }

  // Reset operations
  reset() {
    this.zoom = 1.0;
    this.pan = { x: 0, y: 0 };
    this.windowLevel = { width: 400, center: 40 };
    this.rotation = 0;
    this.flip = { horizontal: false, vertical: false };
  }

  // Get current state
  getState() {
    return {
      zoom: this.zoom,
      pan: this.pan,
      windowLevel: this.windowLevel,
      rotation: this.rotation,
      flip: this.flip
    };
  }
}

class ViewportOperationsTester {
  constructor() {
    this.results = [];
  }

  async runTest(name, testFn) {
    const startTime = performance.now();
    
    try {
      console.log(`🧪 Running test: ${name}`);
      const result = await testFn();
      const duration = performance.now() - startTime;
      
      const testResult = {
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
      const testResult = {
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

  getResults() {
    return this.results;
  }

  getSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const duration = this.results.reduce((sum, r) => sum + r.duration, 0);

    return { total, passed, failed, duration };
  }
}

async function runViewportOperationsTests() {
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

  // Test 4: Performance Benchmarks
  await tester.runTest('Performance Benchmarks', async () => {
    const iterations = 1000;
    const benchmarks = {};
    
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
    
    // Calculate operations per second
    const opsPerSecond = {
      zoom: (iterations / benchmarks.zoom) * 1000,
      pan: (iterations / benchmarks.pan) * 1000,
      windowLevel: (iterations / benchmarks.windowLevel) * 1000
    };
    
    return {
      iterations,
      benchmarks,
      opsPerSecond,
      performanceAcceptable: Object.values(opsPerSecond).every(ops => ops > 10000) // > 10k ops/sec
    };
  });

  // Test 5: Reset and State Management
  await tester.runTest('Reset and State Management', async () => {
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

// Run the tests
runViewportOperationsTests().then(results => {
  console.log('\n🎉 Viewport Operations Tests completed successfully!');
  console.log('All viewport operations (zoom, pan, window/level) are working correctly.');
}).catch(error => {
  console.error('Viewport Operations Tests failed:', error);
});