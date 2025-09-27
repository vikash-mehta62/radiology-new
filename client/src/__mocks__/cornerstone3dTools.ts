/**
 * Mock for @cornerstonejs/tools
 */

export const ToolGroupManager = {
  createToolGroup: jest.fn().mockReturnValue({
    id: 'mock-tool-group',
    addTool: jest.fn(),
    addToolInstance: jest.fn(),
    setToolActive: jest.fn(),
    setToolPassive: jest.fn(),
    setToolEnabled: jest.fn(),
    setToolDisabled: jest.fn(),
    setToolConfiguration: jest.fn(),
    getToolConfiguration: jest.fn(() => ({})),
    addViewport: jest.fn(),
    removeViewports: jest.fn(),
    getViewportsInfo: jest.fn(() => []),
    destroy: jest.fn()
  }),
  getToolGroup: jest.fn(),
  getAllToolGroups: jest.fn(() => []),
  destroyToolGroup: jest.fn()
};

export const annotation = {
  state: {
    getAnnotations: jest.fn(() => []),
    addAnnotation: jest.fn(),
    removeAnnotation: jest.fn(),
    getAnnotation: jest.fn(),
    getAllAnnotations: jest.fn(() => []),
    getNumberOfAllAnnotations: jest.fn(() => 0),
    removeAllAnnotations: jest.fn()
  },
  selection: {
    setAnnotationSelected: jest.fn(),
    setAnnotationUnselected: jest.fn(),
    isAnnotationSelected: jest.fn(() => false),
    getAnnotationsSelected: jest.fn(() => []),
    deselectAllAnnotations: jest.fn()
  },
  locking: {
    setAnnotationLocked: jest.fn(),
    setAnnotationUnlocked: jest.fn(),
    isAnnotationLocked: jest.fn(() => false),
    getAnnotationsLocked: jest.fn(() => [])
  },
  visibility: {
    setAnnotationVisibility: jest.fn(),
    isAnnotationVisible: jest.fn(() => true)
  }
};

export const drawing = {
  drawLine: jest.fn(),
  drawCircle: jest.fn(),
  drawEllipse: jest.fn(),
  drawRect: jest.fn(),
  drawPath: jest.fn(),
  drawArrow: jest.fn(),
  drawTextBox: jest.fn()
};

// Mock Tools
export const WindowLevelTool = jest.fn().mockImplementation(() => ({
  toolName: 'WindowLevel',
  supportedInteractionTypes: ['Mouse', 'Touch'],
  configuration: {},
  
  onSetToolActive: jest.fn(),
  onSetToolPassive: jest.fn(),
  onSetToolEnabled: jest.fn(),
  onSetToolDisabled: jest.fn(),
  
  preMouseDownCallback: jest.fn(),
  postMouseDownCallback: jest.fn(),
  mouseDragCallback: jest.fn(),
  mouseUpCallback: jest.fn(),
  
  touchDragCallback: jest.fn(),
  touchEndCallback: jest.fn(),
  
  renderAnnotation: jest.fn(),
  cancel: jest.fn()
}));

export const PanTool = jest.fn().mockImplementation(() => ({
  toolName: 'Pan',
  supportedInteractionTypes: ['Mouse', 'Touch'],
  configuration: {},
  
  onSetToolActive: jest.fn(),
  onSetToolPassive: jest.fn(),
  onSetToolEnabled: jest.fn(),
  onSetToolDisabled: jest.fn(),
  
  preMouseDownCallback: jest.fn(),
  postMouseDownCallback: jest.fn(),
  mouseDragCallback: jest.fn(),
  mouseUpCallback: jest.fn(),
  
  touchDragCallback: jest.fn(),
  touchEndCallback: jest.fn(),
  
  cancel: jest.fn()
}));

export const ZoomTool = jest.fn().mockImplementation(() => ({
  toolName: 'Zoom',
  supportedInteractionTypes: ['Mouse', 'Touch', 'Wheel'],
  configuration: {},
  
  onSetToolActive: jest.fn(),
  onSetToolPassive: jest.fn(),
  onSetToolEnabled: jest.fn(),
  onSetToolDisabled: jest.fn(),
  
  preMouseDownCallback: jest.fn(),
  postMouseDownCallback: jest.fn(),
  mouseDragCallback: jest.fn(),
  mouseUpCallback: jest.fn(),
  mouseWheelCallback: jest.fn(),
  
  touchDragCallback: jest.fn(),
  touchEndCallback: jest.fn(),
  
  cancel: jest.fn()
}));

export const StackScrollMouseWheelTool = jest.fn().mockImplementation(() => ({
  toolName: 'StackScrollMouseWheel',
  supportedInteractionTypes: ['Wheel'],
  configuration: {},
  
  onSetToolActive: jest.fn(),
  onSetToolPassive: jest.fn(),
  onSetToolEnabled: jest.fn(),
  onSetToolDisabled: jest.fn(),
  
  mouseWheelCallback: jest.fn(),
  
  cancel: jest.fn()
}));

export const LengthTool = jest.fn().mockImplementation(() => ({
  toolName: 'Length',
  supportedInteractionTypes: ['Mouse', 'Touch'],
  configuration: {},
  
  onSetToolActive: jest.fn(),
  onSetToolPassive: jest.fn(),
  onSetToolEnabled: jest.fn(),
  onSetToolDisabled: jest.fn(),
  
  preMouseDownCallback: jest.fn(),
  postMouseDownCallback: jest.fn(),
  mouseDragCallback: jest.fn(),
  mouseUpCallback: jest.fn(),
  mouseMoveCallback: jest.fn(),
  
  touchDragCallback: jest.fn(),
  touchEndCallback: jest.fn(),
  
  renderAnnotation: jest.fn(),
  cancel: jest.fn(),
  
  addNewAnnotation: jest.fn(),
  isPointNearTool: jest.fn(() => false),
  getHandleNearImagePoint: jest.fn()
}));

export const RectangleROITool = jest.fn().mockImplementation(() => ({
  toolName: 'RectangleROI',
  supportedInteractionTypes: ['Mouse', 'Touch'],
  configuration: {},
  
  onSetToolActive: jest.fn(),
  onSetToolPassive: jest.fn(),
  onSetToolEnabled: jest.fn(),
  onSetToolDisabled: jest.fn(),
  
  preMouseDownCallback: jest.fn(),
  postMouseDownCallback: jest.fn(),
  mouseDragCallback: jest.fn(),
  mouseUpCallback: jest.fn(),
  mouseMoveCallback: jest.fn(),
  
  touchDragCallback: jest.fn(),
  touchEndCallback: jest.fn(),
  
  renderAnnotation: jest.fn(),
  cancel: jest.fn(),
  
  addNewAnnotation: jest.fn(),
  isPointNearTool: jest.fn(() => false),
  getHandleNearImagePoint: jest.fn()
}));

export const EllipticalROITool = jest.fn().mockImplementation(() => ({
  toolName: 'EllipticalROI',
  supportedInteractionTypes: ['Mouse', 'Touch'],
  configuration: {},
  
  onSetToolActive: jest.fn(),
  onSetToolPassive: jest.fn(),
  onSetToolEnabled: jest.fn(),
  onSetToolDisabled: jest.fn(),
  
  preMouseDownCallback: jest.fn(),
  postMouseDownCallback: jest.fn(),
  mouseDragCallback: jest.fn(),
  mouseUpCallback: jest.fn(),
  mouseMoveCallback: jest.fn(),
  
  touchDragCallback: jest.fn(),
  touchEndCallback: jest.fn(),
  
  renderAnnotation: jest.fn(),
  cancel: jest.fn(),
  
  addNewAnnotation: jest.fn(),
  isPointNearTool: jest.fn(() => false),
  getHandleNearImagePoint: jest.fn()
}));

export const ArrowAnnotateTool = jest.fn().mockImplementation(() => ({
  toolName: 'ArrowAnnotate',
  supportedInteractionTypes: ['Mouse', 'Touch'],
  configuration: {},
  
  onSetToolActive: jest.fn(),
  onSetToolPassive: jest.fn(),
  onSetToolEnabled: jest.fn(),
  onSetToolDisabled: jest.fn(),
  
  preMouseDownCallback: jest.fn(),
  postMouseDownCallback: jest.fn(),
  mouseDragCallback: jest.fn(),
  mouseUpCallback: jest.fn(),
  mouseMoveCallback: jest.fn(),
  
  touchDragCallback: jest.fn(),
  touchEndCallback: jest.fn(),
  
  renderAnnotation: jest.fn(),
  cancel: jest.fn(),
  
  addNewAnnotation: jest.fn(),
  isPointNearTool: jest.fn(() => false),
  getHandleNearImagePoint: jest.fn()
}));

export const ProbeTool = jest.fn().mockImplementation(() => ({
  toolName: 'Probe',
  supportedInteractionTypes: ['Mouse', 'Touch'],
  configuration: {},
  
  onSetToolActive: jest.fn(),
  onSetToolPassive: jest.fn(),
  onSetToolEnabled: jest.fn(),
  onSetToolDisabled: jest.fn(),
  
  preMouseDownCallback: jest.fn(),
  postMouseDownCallback: jest.fn(),
  mouseMoveCallback: jest.fn(),
  
  renderAnnotation: jest.fn(),
  cancel: jest.fn(),
  
  addNewAnnotation: jest.fn()
}));

export const CrosshairsTool = jest.fn().mockImplementation(() => ({
  toolName: 'Crosshairs',
  supportedInteractionTypes: ['Mouse', 'Touch'],
  configuration: {},
  
  onSetToolActive: jest.fn(),
  onSetToolPassive: jest.fn(),
  onSetToolEnabled: jest.fn(),
  onSetToolDisabled: jest.fn(),
  
  preMouseDownCallback: jest.fn(),
  postMouseDownCallback: jest.fn(),
  mouseDragCallback: jest.fn(),
  mouseUpCallback: jest.fn(),
  mouseMoveCallback: jest.fn(),
  
  touchDragCallback: jest.fn(),
  touchEndCallback: jest.fn(),
  
  renderAnnotation: jest.fn(),
  cancel: jest.fn()
}));

export const utilities = {
  math: {
    point: {
      distanceToPoint: jest.fn(() => 0),
      distanceToPointSquared: jest.fn(() => 0)
    },
    line: {
      distanceToPoint: jest.fn(() => 0),
      intersectLine: jest.fn()
    },
    rectangle: {
      distanceToPoint: jest.fn(() => 0)
    },
    ellipse: {
      distanceToPoint: jest.fn(() => 0)
    }
  },
  viewport: {
    jumpToSlice: jest.fn(),
    scroll: jest.fn()
  },
  stackPrefetch: {
    enable: jest.fn(),
    disable: jest.fn()
  },
  orientation: {
    invertOrientationStringLPS: jest.fn(),
    getOrientationStringLPS: jest.fn(() => 'LPS')
  }
};

export const cursors = {
  MouseCursor: {
    setDefinedCursor: jest.fn(),
    setCustomCursor: jest.fn()
  }
};

export const init = jest.fn().mockResolvedValue(true);
export const destroy = jest.fn();

export const CONSTANTS = {
  TOOL_NAMES: {
    WindowLevel: 'WindowLevel',
    Pan: 'Pan',
    Zoom: 'Zoom',
    StackScrollMouseWheel: 'StackScrollMouseWheel',
    Length: 'Length',
    RectangleROI: 'RectangleROI',
    EllipticalROI: 'EllipticalROI',
    ArrowAnnotate: 'ArrowAnnotate',
    Probe: 'Probe',
    Crosshairs: 'Crosshairs'
  },
  MOUSE: {
    LEFT: 1,
    MIDDLE: 2,
    RIGHT: 3
  },
  TOUCH: {
    SINGLE: 1,
    MULTI: 2
  }
};

export default {
  ToolGroupManager,
  annotation,
  drawing,
  WindowLevelTool,
  PanTool,
  ZoomTool,
  StackScrollMouseWheelTool,
  LengthTool,
  RectangleROITool,
  EllipticalROITool,
  ArrowAnnotateTool,
  ProbeTool,
  CrosshairsTool,
  utilities,
  cursors,
  init,
  destroy,
  CONSTANTS
};