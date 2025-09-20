/**
 * Unit Tests for UnifiedStateManager
 * Comprehensive tests for state management functionality
 */

import { UnifiedStateManager, ViewerState, GlobalState } from '../unifiedStateManager';
import { MockStateGenerator, PerformanceTestUtils, AsyncTestUtils } from './testUtils';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn()
};

// Setup mocks
beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage
  });
  
  Object.defineProperty(window, 'indexedDB', {
    value: mockIndexedDB
  });
});

describe('UnifiedStateManager', () => {
  let stateManager: UnifiedStateManager;
  let mockState: GlobalState;

  beforeEach(() => {
    jest.clearAllMocks();
    stateManager = new UnifiedStateManager();
    mockState = MockStateGenerator.generateMockGlobalState();
  });

  afterEach(() => {
    stateManager.cleanup();
  });

  describe('Initialization', () => {
    test('should initialize with default state', async () => {
      await stateManager.initialize();
      
      const state = stateManager.getState();
      expect(state).toBeDefined();
      expect(state.currentMode).toBeNull();
      expect(state.viewerStates).toEqual({});
      expect(state.userPreferences).toBeDefined();
      expect(state.application).toBeDefined();
    });

    test('should emit initialized event', async () => {
      const initializeHandler = jest.fn();
      stateManager.on('initialized', initializeHandler);
      
      await stateManager.initialize();
      
      expect(initializeHandler).toHaveBeenCalledWith(expect.any(Object));
    });

    test('should handle initialization errors gracefully', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      await expect(stateManager.initialize()).rejects.toThrow();
    });
  });

  describe('State Management', () => {
    beforeEach(async () => {
      await stateManager.initialize();
    });

    test('should update global state', () => {
      const changeHandler = jest.fn();
      stateManager.on('stateChange', changeHandler);
      
      stateManager.updateState('currentMode', 'simple', 'test');
      
      const state = stateManager.getState();
      expect(state.currentMode).toBe('simple');
      expect(changeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'global',
          path: 'currentMode',
          newValue: 'simple',
          source: 'test'
        })
      );
    });

    test('should update viewer state', () => {
      const changeHandler = jest.fn();
      stateManager.on('stateChange', changeHandler);
      
      stateManager.updateViewerState('simple', 'viewport.zoom', 2.0, 'test');
      
      const viewerState = stateManager.getViewerState('simple');
      expect(viewerState?.viewport.zoom).toBe(2.0);
      expect(changeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'viewer',
          path: 'viewerStates.simple.viewport.zoom',
          newValue: 2.0,
          source: 'test'
        })
      );
    });

    test('should create viewer state if it does not exist', () => {
      stateManager.updateViewerState('new-mode', 'currentSliceIndex', 5, 'test');
      
      const viewerState = stateManager.getViewerState('new-mode');
      expect(viewerState).toBeDefined();
      expect(viewerState?.currentSliceIndex).toBe(5);
    });

    test('should handle nested state updates', () => {
      stateManager.updateState('userPreferences.theme', 'light', 'test');
      
      const state = stateManager.getState();
      expect(state.userPreferences.theme).toBe('light');
    });
  });

  describe('Mode Switching', () => {
    beforeEach(async () => {
      await stateManager.initialize();
    });

    test('should switch viewer mode', () => {
      const changeHandler = jest.fn();
      stateManager.on('stateChange', changeHandler);
      
      stateManager.switchMode('simple');
      
      const state = stateManager.getState();
      expect(state.currentMode).toBe('simple');
      expect(changeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'global',
          path: 'currentMode',
          newValue: 'simple'
        })
      );
    });

    test('should preserve state when switching modes', () => {
      // Set up initial state
      stateManager.switchMode('simple');
      stateManager.updateViewerState('simple', 'viewport.zoom', 2.0, 'test');
      stateManager.updateViewerState('simple', 'currentSliceIndex', 5, 'test');
      
      // Switch to another mode and back
      stateManager.switchMode('multi-frame', true);
      stateManager.switchMode('simple', true);
      
      const viewerState = stateManager.getViewerState('simple');
      expect(viewerState?.viewport.zoom).toBe(2.0);
      expect(viewerState?.currentSliceIndex).toBe(5);
    });

    test('should not preserve state when preserveState is false', () => {
      // Set up initial state
      stateManager.switchMode('simple');
      stateManager.updateViewerState('simple', 'viewport.zoom', 2.0, 'test');
      
      // Switch mode without preserving state
      stateManager.switchMode('multi-frame', false);
      stateManager.switchMode('simple', false);
      
      const viewerState = stateManager.getViewerState('simple');
      expect(viewerState?.viewport.zoom).toBe(1.0); // Default value
    });
  });

  describe('Snapshots', () => {
    beforeEach(async () => {
      await stateManager.initialize();
    });

    test('should create state snapshot', () => {
      const snapshot = stateManager.createSnapshot('Test snapshot', ['test']);
      
      expect(snapshot).toBeDefined();
      expect(snapshot.id).toMatch(/^snapshot-\d+$/);
      expect(snapshot.metadata.description).toBe('Test snapshot');
      expect(snapshot.metadata.tags).toContain('test');
      expect(snapshot.state).toEqual(stateManager.getState());
    });

    test('should restore from snapshot', () => {
      // Create initial state
      stateManager.updateState('currentMode', 'simple', 'test');
      const snapshot = stateManager.createSnapshot();
      
      // Change state
      stateManager.updateState('currentMode', 'multi-frame', 'test');
      expect(stateManager.getState().currentMode).toBe('multi-frame');
      
      // Restore snapshot
      const success = stateManager.restoreSnapshot(snapshot.id);
      expect(success).toBe(true);
      expect(stateManager.getState().currentMode).toBe('simple');
    });

    test('should handle invalid snapshot ID', () => {
      const success = stateManager.restoreSnapshot('invalid-id');
      expect(success).toBe(false);
    });

    test('should limit snapshot history', () => {
      // Create more snapshots than the limit
      for (let i = 0; i < 60; i++) {
        stateManager.createSnapshot(`Snapshot ${i}`);
      }
      
      const snapshots = stateManager.getSnapshots();
      expect(snapshots.length).toBeLessThanOrEqual(50); // Default limit
    });

    test('should clear snapshots', () => {
      stateManager.createSnapshot('Test 1');
      stateManager.createSnapshot('Test 2');
      
      expect(stateManager.getSnapshots().length).toBe(2);
      
      stateManager.clearSnapshots();
      expect(stateManager.getSnapshots().length).toBe(0);
    });
  });

  describe('State Persistence', () => {
    beforeEach(async () => {
      await stateManager.initialize();
    });

    test('should persist state to localStorage', async () => {
      stateManager.updateState('currentMode', 'simple', 'test');
      
      await stateManager.persistState();
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'unified-viewer-state',
        expect.stringContaining('"currentMode":"simple"')
      );
    });

    test('should handle persistence errors', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });
      
      await expect(stateManager.persistState()).rejects.toThrow('Storage full');
    });

    test('should export state', () => {
      stateManager.updateState('currentMode', 'simple', 'test');
      
      const exported = stateManager.exportState();
      
      expect(exported).toHaveProperty('state');
      expect(exported).toHaveProperty('snapshots');
      expect(exported).toHaveProperty('version');
      expect(exported).toHaveProperty('exportedAt');
      expect(exported.state.currentMode).toBe('simple');
    });

    test('should import state', () => {
      const importData = {
        state: mockState,
        snapshots: [],
        version: '1.0.0'
      };
      
      const success = stateManager.importState(importData);
      
      expect(success).toBe(true);
      expect(stateManager.getState().currentMode).toBe(mockState.currentMode);
    });

    test('should handle invalid import data', () => {
      const success = stateManager.importState({ invalid: 'data' });
      
      expect(success).toBe(false);
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await stateManager.initialize();
    });

    test('should emit state change events', () => {
      const changeHandler = jest.fn();
      stateManager.on('stateChange', changeHandler);
      
      stateManager.updateState('currentMode', 'simple', 'test');
      
      expect(changeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'global',
          path: 'currentMode',
          oldValue: null,
          newValue: 'simple',
          source: 'test'
        })
      );
    });

    test('should emit snapshot events', () => {
      const snapshotHandler = jest.fn();
      stateManager.on('snapshotCreated', snapshotHandler);
      
      const snapshot = stateManager.createSnapshot();
      
      expect(snapshotHandler).toHaveBeenCalledWith(snapshot);
    });

    test('should emit restore events', () => {
      const restoreHandler = jest.fn();
      stateManager.on('stateRestored', restoreHandler);
      
      const snapshot = stateManager.createSnapshot();
      stateManager.restoreSnapshot(snapshot.id);
      
      expect(restoreHandler).toHaveBeenCalledWith(snapshot);
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await stateManager.initialize();
    });

    test('should handle large state updates efficiently', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('Large State Update', 100);
      
      const result = await benchmark.run(() => {
        for (let i = 0; i < 1000; i++) {
          stateManager.updateState(`test.item${i}`, i, 'performance-test');
        }
      });
      
      expect(result.passed).toBe(true);
    });

    test('should handle frequent state updates', async () => {
      const benchmark = PerformanceTestUtils.createBenchmark('Frequent Updates', 50);
      
      const result = await benchmark.run(async () => {
        for (let i = 0; i < 100; i++) {
          stateManager.updateViewerState('simple', 'currentSliceIndex', i, 'test');
          await AsyncTestUtils.delay(1); // Simulate real-world timing
        }
      });
      
      expect(result.passed).toBe(true);
    });

    test('should not have memory leaks', () => {
      const memoryDetector = PerformanceTestUtils.createMemoryLeakDetector(20);
      
      // Perform operations that might cause leaks
      for (let i = 0; i < 100; i++) {
        stateManager.createSnapshot(`Test ${i}`);
        stateManager.updateState(`test.${i}`, i, 'test');
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const leakCheck = memoryDetector.check();
      expect(leakCheck.hasLeak).toBe(false);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await stateManager.initialize();
    });

    test('should handle invalid state paths', () => {
      expect(() => {
        stateManager.updateState('', 'value', 'test');
      }).not.toThrow();
    });

    test('should handle circular references in state', () => {
      const circularObject: any = { name: 'test' };
      circularObject.self = circularObject;
      
      expect(() => {
        stateManager.updateState('circular', circularObject, 'test');
      }).not.toThrow();
    });

    test('should emit error events', () => {
      const errorHandler = jest.fn();
      stateManager.on('error', errorHandler);
      
      stateManager.emit('error', new Error('Test error'));
      
      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Cleanup', () => {
    test('should cleanup resources properly', async () => {
      await stateManager.initialize();
      
      const listenerCount = stateManager.listenerCount('stateChange');
      stateManager.cleanup();
      
      expect(stateManager.listenerCount('stateChange')).toBe(0);
    });

    test('should handle multiple cleanup calls', async () => {
      await stateManager.initialize();
      
      expect(() => {
        stateManager.cleanup();
        stateManager.cleanup();
      }).not.toThrow();
    });
  });

  describe('Concurrency', () => {
    beforeEach(async () => {
      await stateManager.initialize();
    });

    test('should handle concurrent state updates', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve().then(() => {
          stateManager.updateState(`concurrent.${i}`, i, 'test');
        })
      );
      
      await Promise.all(promises);
      
      const state = stateManager.getState();
      for (let i = 0; i < 10; i++) {
        expect((state as any).concurrent[i]).toBe(i);
      }
    });

    test('should handle concurrent snapshot operations', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        Promise.resolve().then(() => {
          return stateManager.createSnapshot(`Concurrent ${i}`);
        })
      );
      
      const snapshots = await Promise.all(promises);
      
      expect(snapshots).toHaveLength(5);
      expect(stateManager.getSnapshots()).toHaveLength(5);
    });
  });
});