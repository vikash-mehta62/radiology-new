/**
 * Image Adjustment Panel Component
 * Provides UI controls for real-time image adjustments with histogram display
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Brightness6 as BrightnessIcon,
  Contrast as ContrastIcon,
  Tune as GammaIcon,
  Tune as TuneIcon,
  Palette as PaletteIcon,
  Refresh as ResetIcon,
  GetApp as ImportIcon,
  Publish as ExportIcon,
  BarChart as HistogramIcon,
  AutoFixHigh as AutoIcon
} from '@mui/icons-material';
import {
  ImageAdjustmentControls,
  ImageAdjustments,
  WindowingPreset,
  HistogramData,
  AdjustmentEvent
} from '../../services/imageAdjustmentControls';

export interface ImageAdjustmentPanelProps {
  adjustmentControls?: ImageAdjustmentControls;
  onAdjustmentChange?: (adjustments: ImageAdjustments) => void;
  showHistogram?: boolean;
  showPresets?: boolean;
  showAdvanced?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const ImageAdjustmentPanel: React.FC<ImageAdjustmentPanelProps> = ({
  adjustmentControls,
  onAdjustmentChange,
  showHistogram = true,
  showPresets = true,
  showAdvanced = false,
  className = '',
  style = {}
}) => {
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({
    brightness: 0,
    contrast: 1,
    gamma: 1,
    windowCenter: 0.5,
    windowWidth: 1.0,
    invert: false,
    colormap: 'grayscale',
    saturation: 1,
    hue: 0,
    exposure: 0
  });

  const [histogramData, setHistogramData] = useState<HistogramData | null>(null);
  const [windowingPresets, setWindowingPresets] = useState<WindowingPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [showAdvancedControls, setShowAdvancedControls] = useState(showAdvanced);
  const [isAdjusting, setIsAdjusting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize adjustment controls
  useEffect(() => {
    if (adjustmentControls) {
      // Get initial state
      setAdjustments(adjustmentControls.getAdjustments());
      setWindowingPresets(adjustmentControls.getWindowingPresets());
      setHistogramData(adjustmentControls.getHistogramData());

      // Setup event listener
      const handleAdjustment = (event: AdjustmentEvent) => {
        setAdjustments(event.adjustments);
        onAdjustmentChange?.(event.adjustments);

        if (event.type === 'adjustment_start') {
          setIsAdjusting(true);
        } else if (event.type === 'adjustment_end') {
          setIsAdjusting(false);
        }

        if (event.preset) {
          setSelectedPreset(event.preset.name);
        }
      };

      adjustmentControls.onAdjustment(handleAdjustment);

      return () => {
        adjustmentControls.removeAdjustmentListener(handleAdjustment);
      };
    }
  }, [adjustmentControls, onAdjustmentChange]);

  // Draw histogram
  useEffect(() => {
    if (histogramData && canvasRef.current && showHistogram) {
      drawHistogram(histogramData, canvasRef.current);
    }
  }, [histogramData, showHistogram]);

  const drawHistogram = (data: HistogramData, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Find max value for scaling
    const maxValue = Math.max(...data.values);
    if (maxValue === 0) return;

    // Draw histogram bars
    const barWidth = width / data.values.length;
    ctx.fillStyle = '#4CAF50';

    data.values.forEach((value, index) => {
      const barHeight = (value / maxValue) * height * 0.8;
      const x = index * barWidth;
      const y = height - barHeight;
      
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });

    // Draw statistics overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, 60);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.fillText(`Min: ${data.min.toFixed(1)}`, 10, 15);
    ctx.fillText(`Max: ${data.max.toFixed(1)}`, 10, 30);
    ctx.fillText(`Mean: ${data.mean.toFixed(1)}`, 10, 45);
    
    ctx.fillText(`Median: ${data.median.toFixed(1)}`, 100, 15);
    ctx.fillText(`StdDev: ${data.standardDeviation.toFixed(1)}`, 100, 30);
    ctx.fillText(`Entropy: ${data.entropy.toFixed(2)}`, 100, 45);
  };

  const handleSliderChange = (property: keyof ImageAdjustments, value: number) => {
    if (!adjustmentControls) return;

    switch (property) {
      case 'brightness':
        adjustmentControls.setBrightness(value);
        break;
      case 'contrast':
        adjustmentControls.setContrast(value);
        break;
      case 'gamma':
        adjustmentControls.setGamma(value);
        break;
      case 'windowCenter':
        adjustmentControls.setWindowCenter(value);
        break;
      case 'windowWidth':
        adjustmentControls.setWindowWidth(value);
        break;
      case 'saturation':
        adjustmentControls.setSaturation(value);
        break;
      case 'hue':
        adjustmentControls.setHue(value);
        break;
      case 'exposure':
        adjustmentControls.setExposure(value);
        break;
    }
  };

  const handlePresetChange = (presetName: string) => {
    if (!adjustmentControls) return;
    
    if (adjustmentControls.applyWindowingPreset(presetName)) {
      setSelectedPreset(presetName);
    }
  };

  const handleColormapChange = (colormap: string) => {
    if (!adjustmentControls) return;
    adjustmentControls.setColormap(colormap);
  };

  const handleInvertToggle = () => {
    if (!adjustmentControls) return;
    adjustmentControls.toggleInvert();
  };

  const handleReset = () => {
    if (!adjustmentControls) return;
    adjustmentControls.reset();
    setSelectedPreset('');
  };

  const handleAutoAdjust = () => {
    if (!adjustmentControls) return;
    adjustmentControls.autoAdjustLevels();
  };

  const handleExport = () => {
    if (!adjustmentControls) return;
    
    const settings = adjustmentControls.exportSettings();
    const blob = new Blob([settings], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'image-adjustments.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!adjustmentControls) return;
    
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (adjustmentControls.importSettings(content)) {
        setAdjustments(adjustmentControls.getAdjustments());
        setWindowingPresets(adjustmentControls.getWindowingPresets());
      }
    };
    reader.readAsText(file);
  };

  const limits = adjustmentControls?.getLimits();
  const colormaps = adjustmentControls?.getAvailableColormaps() || [];

  return (
    <div className={`image-adjustment-panel ${className}`} style={style}>
      {/* Header */}
      <div className="panel-header">
        <h3>
          <TuneIcon sx={{ fontSize: 20, marginRight: 1 }} />
          Image Adjustments
        </h3>
        <div className="header-actions">
          <button onClick={handleAutoAdjust} title="Auto Adjust" className="icon-button">
            <AutoIcon sx={{ fontSize: 18 }} />
          </button>
          <button onClick={handleReset} title="Reset" className="icon-button">
            <ResetIcon sx={{ fontSize: 18 }} />
          </button>
          <button onClick={handleExport} title="Export Settings" className="icon-button">
            <ExportIcon sx={{ fontSize: 18 }} />
          </button>
          <button onClick={() => fileInputRef.current?.click()} title="Import Settings" className="icon-button">
            <ImportIcon sx={{ fontSize: 18 }} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Windowing Presets */}
      {showPresets && (
        <div className="presets-section">
          <label>Windowing Presets:</label>
          <select
            value={selectedPreset}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="preset-selector"
          >
            <option value="">Custom</option>
            {windowingPresets.map(preset => (
              <option key={preset.name} value={preset.name}>
                {preset.name} - {preset.description}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Basic Controls */}
      <div className="controls-section">
        <div className="control-group">
          <label>
            <BrightnessIcon sx={{ fontSize: 16, marginRight: 1 }} />
            Brightness: {adjustments.brightness.toFixed(2)}
          </label>
          <input
            type="range"
            min={limits?.brightness.min || -1}
            max={limits?.brightness.max || 1}
            step="0.01"
            value={adjustments.brightness}
            onChange={(e) => handleSliderChange('brightness', Number(e.target.value))}
            className="adjustment-slider"
          />
        </div>

        <div className="control-group">
          <label>
            <ContrastIcon sx={{ fontSize: 16, marginRight: 1 }} />
            Contrast: {adjustments.contrast.toFixed(2)}
          </label>
          <input
            type="range"
            min={limits?.contrast.min || 0.1}
            max={limits?.contrast.max || 5}
            step="0.01"
            value={adjustments.contrast}
            onChange={(e) => handleSliderChange('contrast', Number(e.target.value))}
            className="adjustment-slider"
          />
        </div>

        <div className="control-group">
          <label>
            <GammaIcon sx={{ fontSize: 16, marginRight: 1 }} />
            Gamma: {adjustments.gamma.toFixed(2)}
          </label>
          <input
            type="range"
            min={limits?.gamma.min || 0.1}
            max={limits?.gamma.max || 3}
            step="0.01"
            value={adjustments.gamma}
            onChange={(e) => handleSliderChange('gamma', Number(e.target.value))}
            className="adjustment-slider"
          />
        </div>

        {/* Windowing Controls */}
        <div className="control-group">
          <label>Window Center: {adjustments.windowCenter.toFixed(1)}</label>
          <input
            type="range"
            min={limits?.windowCenter.min || -1000}
            max={limits?.windowCenter.max || 3000}
            step="1"
            value={adjustments.windowCenter}
            onChange={(e) => handleSliderChange('windowCenter', Number(e.target.value))}
            className="adjustment-slider"
          />
        </div>

        <div className="control-group">
          <label>Window Width: {adjustments.windowWidth.toFixed(1)}</label>
          <input
            type="range"
            min={limits?.windowWidth.min || 1}
            max={limits?.windowWidth.max || 4000}
            step="1"
            value={adjustments.windowWidth}
            onChange={(e) => handleSliderChange('windowWidth', Number(e.target.value))}
            className="adjustment-slider"
          />
        </div>
      </div>

      {/* Advanced Controls */}
      {showAdvancedControls && (
        <div className="advanced-controls">
          <div className="control-group">
            <label>Saturation: {adjustments.saturation.toFixed(2)}</label>
            <input
              type="range"
              min={limits?.saturation.min || 0}
              max={limits?.saturation.max || 2}
              step="0.01"
              value={adjustments.saturation}
              onChange={(e) => handleSliderChange('saturation', Number(e.target.value))}
              className="adjustment-slider"
            />
          </div>

          <div className="control-group">
            <label>Hue: {adjustments.hue.toFixed(0)}°</label>
            <input
              type="range"
              min={limits?.hue.min || -180}
              max={limits?.hue.max || 180}
              step="1"
              value={adjustments.hue}
              onChange={(e) => handleSliderChange('hue', Number(e.target.value))}
              className="adjustment-slider"
            />
          </div>

          <div className="control-group">
            <label>Exposure: {adjustments.exposure.toFixed(2)}</label>
            <input
              type="range"
              min={limits?.exposure.min || -2}
              max={limits?.exposure.max || 2}
              step="0.01"
              value={adjustments.exposure}
              onChange={(e) => handleSliderChange('exposure', Number(e.target.value))}
              className="adjustment-slider"
            />
          </div>
        </div>
      )}

      {/* Colormap and Options */}
      <div className="options-section">
        <div className="control-group">
          <label>
            <PaletteIcon sx={{ fontSize: 16, marginRight: 1 }} />
            Colormap:
          </label>
          <select
            value={adjustments.colormap}
            onChange={(e) => handleColormapChange(e.target.value)}
            className="colormap-selector"
          >
            {colormaps.map(colormap => (
              <option key={colormap} value={colormap}>
                {colormap.charAt(0).toUpperCase() + colormap.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={adjustments.invert}
              onChange={handleInvertToggle}
            />
            Invert
          </label>
        </div>

        <div className="control-group">
          <button
            onClick={() => setShowAdvancedControls(!showAdvancedControls)}
            className="toggle-advanced"
          >
            {showAdvancedControls ? 'Hide' : 'Show'} Advanced Controls
          </button>
        </div>
      </div>

      {/* Histogram */}
      {showHistogram && (
        <div className="histogram-section">
          <div className="histogram-header">
            <label>
              <HistogramIcon sx={{ fontSize: 16, marginRight: 1 }} />
              Histogram
            </label>
          </div>
          <canvas
            ref={canvasRef}
            width={300}
            height={150}
            className="histogram-canvas"
          />
          {histogramData && (
            <div className="histogram-stats">
              <div className="stat-row">
                <span>Range: {histogramData.min.toFixed(1)} - {histogramData.max.toFixed(1)}</span>
                <span>Mean: {histogramData.mean.toFixed(1)}</span>
              </div>
              <div className="stat-row">
                <span>Median: {histogramData.median.toFixed(1)}</span>
                <span>Std Dev: {histogramData.standardDeviation.toFixed(1)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status */}
      {isAdjusting && (
        <div className="adjustment-status">
          Adjusting...
        </div>
      )}
    </div>
  );
};

export default ImageAdjustmentPanel;