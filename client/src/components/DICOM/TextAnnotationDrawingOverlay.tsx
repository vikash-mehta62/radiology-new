/**
 * Text Annotation and Free Drawing Overlay
 * Provides interactive text annotation and freehand drawing capabilities
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, TextField, Button, Paper, Typography, IconButton, Tooltip } from '@mui/material';
import { 
  TextFields as TextIcon, 
  Gesture as FreehandIcon, 
  Save as SaveIcon, 
  Cancel as CancelIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Clear as ClearIcon,
  Palette as PaletteIcon
} from '@mui/icons-material';

interface Point {
  x: number;
  y: number;
  pressure?: number;
}

interface DrawingPath {
  id: string;
  points: Point[];
  color: string;
  lineWidth: number;
  timestamp: number;
}

interface TextAnnotation {
  id: string;
  text: string;
  position: Point;
  color: string;
  fontSize: number;
  timestamp: number;
}

interface TextAnnotationDrawingOverlayProps {
  width: number;
  height: number;
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
  onAnnotationAdd?: (annotation: TextAnnotation) => void;
  onDrawingAdd?: (path: DrawingPath) => void;
  enabled: boolean;
  mode: 'text' | 'drawing' | null;
  onModeChange?: (mode: 'text' | 'drawing' | null) => void;
}

export const TextAnnotationDrawingOverlay: React.FC<TextAnnotationDrawingOverlayProps> = ({
  width,
  height,
  zoom,
  pan,
  rotation,
  onAnnotationAdd,
  onDrawingAdd,
  enabled,
  mode,
  onModeChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [drawingPaths, setDrawingPaths] = useState<DrawingPath[]>([]);
  const [drawingColor, setDrawingColor] = useState('#FF0000');
  const [lineWidth, setLineWidth] = useState(2);
  
  // Text annotation state
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
  const [activeTextInput, setActiveTextInput] = useState<{
    position: Point;
    text: string;
  } | null>(null);
  const [textColor, setTextColor] = useState('#FFFF00');
  const [fontSize, setFontSize] = useState(16);
  
  // History for undo/redo
  const [history, setHistory] = useState<{
    paths: DrawingPath[];
    annotations: TextAnnotation[];
  }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Apply transformations
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(zoom, zoom);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-width / 2 + pan.x, -height / 2 + pan.y);
    
    // Draw existing paths
    drawingPaths.forEach(path => {
      if (path.points.length < 2) return;
      
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.lineWidth / zoom;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
    });
    
    // Draw current path
    if (currentPath.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = drawingColor;
      ctx.lineWidth = lineWidth / zoom;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
      }
      ctx.stroke();
    }
    
    // Draw text annotations
    textAnnotations.forEach(annotation => {
      ctx.fillStyle = annotation.color;
      ctx.font = `${annotation.fontSize / zoom}px Arial`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(annotation.text, annotation.position.x, annotation.position.y);
    });
    
    ctx.restore();
  }, [width, height, zoom, pan, rotation, drawingPaths, currentPath, textAnnotations, drawingColor, lineWidth]);

  // Convert screen coordinates to canvas coordinates
  const getCanvasCoordinates = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Apply inverse transformations
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Inverse pan
    const panX = x - pan.x;
    const panY = y - pan.y;
    
    // Inverse zoom
    const zoomX = (panX - centerX) / zoom + centerX;
    const zoomY = (panY - centerY) / zoom + centerY;
    
    // Inverse rotation
    const cos = Math.cos((-rotation * Math.PI) / 180);
    const sin = Math.sin((-rotation * Math.PI) / 180);
    const rotX = (zoomX - centerX) * cos - (zoomY - centerY) * sin + centerX;
    const rotY = (zoomX - centerX) * sin + (zoomY - centerY) * cos + centerY;

    return { x: rotX, y: rotY };
  }, [width, height, zoom, pan, rotation]);

  // Mouse event handlers for drawing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!enabled || mode !== 'drawing') return;
    
    setIsDrawing(true);
    const point = getCanvasCoordinates(e.clientX, e.clientY);
    setCurrentPath([point]);
  }, [enabled, mode, getCanvasCoordinates]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!enabled || mode !== 'drawing' || !isDrawing) return;
    
    const point = getCanvasCoordinates(e.clientX, e.clientY);
    setCurrentPath(prev => [...prev, point]);
  }, [enabled, mode, isDrawing, getCanvasCoordinates]);

  const handleMouseUp = useCallback(() => {
    if (!enabled || mode !== 'drawing' || !isDrawing) return;
    
    setIsDrawing(false);
    
    if (currentPath.length > 1) {
      const newPath: DrawingPath = {
        id: `path-${Date.now()}`,
        points: currentPath,
        color: drawingColor,
        lineWidth,
        timestamp: Date.now()
      };
      
      setDrawingPaths(prev => [...prev, newPath]);
      onDrawingAdd?.(newPath);
      
      // Add to history
      const newState = {
        paths: [...drawingPaths, newPath],
        annotations: textAnnotations
      };
      setHistory(prev => [...prev.slice(0, historyIndex + 1), newState]);
      setHistoryIndex(prev => prev + 1);
    }
    
    setCurrentPath([]);
  }, [enabled, mode, isDrawing, currentPath, drawingColor, lineWidth, drawingPaths, textAnnotations, historyIndex, onDrawingAdd]);

  // Click handler for text annotations
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!enabled || mode !== 'text') return;
    
    const point = getCanvasCoordinates(e.clientX, e.clientY);
    setActiveTextInput({ position: point, text: '' });
  }, [enabled, mode, getCanvasCoordinates]);

  // Save text annotation
  const saveTextAnnotation = useCallback(() => {
    if (!activeTextInput || !activeTextInput.text.trim()) return;
    
    const newAnnotation: TextAnnotation = {
      id: `text-${Date.now()}`,
      text: activeTextInput.text,
      position: activeTextInput.position,
      color: textColor,
      fontSize,
      timestamp: Date.now()
    };
    
    setTextAnnotations(prev => [...prev, newAnnotation]);
    onAnnotationAdd?.(newAnnotation);
    
    // Add to history
    const newState = {
      paths: drawingPaths,
      annotations: [...textAnnotations, newAnnotation]
    };
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newState]);
    setHistoryIndex(prev => prev + 1);
    
    setActiveTextInput(null);
  }, [activeTextInput, textColor, fontSize, drawingPaths, textAnnotations, historyIndex, onAnnotationAdd]);

  // Undo/Redo functionality
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setDrawingPaths(prevState.paths);
      setTextAnnotations(prevState.annotations);
      setHistoryIndex(prev => prev - 1);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setDrawingPaths(nextState.paths);
      setTextAnnotations(nextState.annotations);
      setHistoryIndex(prev => prev + 1);
    }
  }, [history, historyIndex]);

  // Clear all
  const clearAll = useCallback(() => {
    setDrawingPaths([]);
    setTextAnnotations([]);
    setCurrentPath([]);
    setActiveTextInput(null);
    
    const newState = { paths: [], annotations: [] };
    setHistory(prev => [...prev, newState]);
    setHistoryIndex(prev => prev + 1);
  }, []);

  if (!enabled) return null;

  return (
    <Box
      ref={overlayRef}
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: mode ? 'auto' : 'none',
        zIndex: 10
      }}
    >
      {/* Drawing Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          cursor: mode === 'drawing' ? 'crosshair' : mode === 'text' ? 'text' : 'default'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleCanvasClick}
      />

      {/* Text Input Dialog */}
      {activeTextInput && (
        <Paper
          sx={{
            position: 'absolute',
            left: activeTextInput.position.x * zoom + pan.x,
            top: activeTextInput.position.y * zoom + pan.y,
            p: 2,
            minWidth: 200,
            zIndex: 1000
          }}
        >
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            placeholder="Enter annotation text..."
            value={activeTextInput.text}
            onChange={(e) => setActiveTextInput(prev => prev ? { ...prev, text: e.target.value } : null)}
            sx={{ mb: 1 }}
          />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              size="small"
              onClick={() => setActiveTextInput(null)}
              startIcon={<CancelIcon />}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={saveTextAnnotation}
              startIcon={<SaveIcon />}
              disabled={!activeTextInput.text.trim()}
            >
              Save
            </Button>
          </Box>
        </Paper>
      )}

      {/* Toolbar */}
      <Paper
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          p: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          zIndex: 1000
        }}
      >
        <Typography variant="caption" sx={{ textAlign: 'center' }}>
          Annotation Tools
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Text Annotation">
            <IconButton
              size="small"
              color={mode === 'text' ? 'primary' : 'default'}
              onClick={() => onModeChange?.(mode === 'text' ? null : 'text')}
            >
              <TextIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Free Drawing">
            <IconButton
              size="small"
              color={mode === 'drawing' ? 'primary' : 'default'}
              onClick={() => onModeChange?.(mode === 'drawing' ? null : 'drawing')}
            >
              <FreehandIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Undo">
            <span>
              <IconButton
                size="small"
                onClick={undo}
                disabled={historyIndex <= 0}
              >
                <UndoIcon />
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title="Redo">
            <span>
              <IconButton
                size="small"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
              >
                <RedoIcon />
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title="Clear All">
            <span>
              <IconButton
                size="small"
                onClick={clearAll}
                disabled={drawingPaths.length === 0 && textAnnotations.length === 0}
              >
                <ClearIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* Color and size controls */}
        {mode && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
            <input
              type="color"
              value={mode === 'drawing' ? drawingColor : textColor}
              onChange={(e) => {
                if (mode === 'drawing') {
                  setDrawingColor(e.target.value);
                } else {
                  setTextColor(e.target.value);
                }
              }}
              style={{ width: '100%', height: 24 }}
            />
            
            {mode === 'drawing' && (
              <input
                type="range"
                min="1"
                max="10"
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            )}
            
            {mode === 'text' && (
              <input
                type="range"
                min="12"
                max="48"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default TextAnnotationDrawingOverlay;