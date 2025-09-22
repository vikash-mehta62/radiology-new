import React, { useState, useEffect } from 'react';
import { LODRenderingService, LODMetrics, LODLevel } from '../../services/lodRenderingService';

interface LODControlPanelProps {
  lodService: LODRenderingService | null;
  isVisible: boolean;
  onToggle: () => void;
}

export const LODControlPanel: React.FC<LODControlPanelProps> = ({
  lodService,
  isVisible,
  onToggle
}) => {
  const [metrics, setMetrics] = useState<LODMetrics | null>(null);
  const [lodLevels, setLodLevels] = useState<LODLevel[]>([]);
  const [adaptiveLOD, setAdaptiveLOD] = useState(true);
  const [manualLOD, setManualLOD] = useState(4);

  useEffect(() => {
    if (!lodService) return;

    // Get initial data
    setLodLevels(lodService.getAllLODLevels());
    setManualLOD(lodService.getCurrentLOD());

    // Update metrics periodically
    const interval = setInterval(() => {
      setMetrics(lodService.getMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, [lodService]);

  const handleAdaptiveLODToggle = () => {
    if (!lodService) return;
    
    const newValue = !adaptiveLOD;
    setAdaptiveLOD(newValue);
    lodService.setAdaptiveLOD(newValue);
  };

  const handleManualLODChange = (level: number) => {
    if (!lodService) return;
    
    setManualLOD(level);
    lodService.setLOD(level);
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'ultra-high': return '#4CAF50';
      case 'high': return '#8BC34A';
      case 'medium': return '#FFC107';
      case 'low': return '#FF9800';
      case 'ultra-low': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getPerformanceColor = (fps: number) => {
    if (fps >= 50) return '#4CAF50';
    if (fps >= 30) return '#FFC107';
    return '#F44336';
  };

  if (!isVisible) {
    return (
      <div className="lod-control-toggle">
        <button
          onClick={onToggle}
          className="lod-toggle-btn"
          title="Show LOD Controls"
        >
          🎚️
        </button>
      </div>
    );
  }

  return (
    <div className="lod-control-panel">
      <div className="lod-header">
        <h3>🎚️ Level of Detail (LOD)</h3>
        <button onClick={onToggle} className="lod-close-btn">×</button>
      </div>

      {/* Current Metrics */}
      {metrics && (
        <div className="lod-metrics">
          <h4>Performance Metrics</h4>
          <div className="metrics-grid">
            <div className="metric-item">
              <span className="metric-label">Current LOD:</span>
              <span 
                className="metric-value"
                style={{ color: getQualityColor(lodLevels[metrics.currentLevel]?.quality || 'medium') }}
              >
                Level {metrics.currentLevel} ({lodLevels[metrics.currentLevel]?.quality})
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Frame Rate:</span>
              <span 
                className="metric-value"
                style={{ color: getPerformanceColor(metrics.frameRate) }}
              >
                {Math.round(metrics.frameRate)} FPS
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Render Time:</span>
              <span className="metric-value">
                {Math.round(metrics.renderTime)}ms
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Memory Usage:</span>
              <span className="metric-value">
                {Math.round(metrics.memoryUsage / (1024 * 1024))}MB
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Status:</span>
              <span className="metric-value">{metrics.adaptationReason}</span>
            </div>
          </div>
        </div>
      )}

      {/* Adaptive LOD Control */}
      <div className="lod-controls">
        <div className="control-group">
          <label className="control-label">
            <input
              type="checkbox"
              checked={adaptiveLOD}
              onChange={handleAdaptiveLODToggle}
            />
            Adaptive LOD (Auto-adjust based on performance)
          </label>
        </div>

        {/* Manual LOD Control */}
        {!adaptiveLOD && (
          <div className="control-group">
            <label className="control-label">Manual LOD Level:</label>
            <div className="lod-slider-container">
              <input
                type="range"
                min="0"
                max={lodLevels.length - 1}
                value={manualLOD}
                onChange={(e) => handleManualLODChange(parseInt(e.target.value))}
                className="lod-slider"
              />
              <div className="lod-level-info">
                {lodLevels[manualLOD] && (
                  <>
                    <span 
                      className="lod-quality"
                      style={{ color: getQualityColor(lodLevels[manualLOD].quality) }}
                    >
                      {lodLevels[manualLOD].quality}
                    </span>
                    <span className="lod-scale">
                      ({Math.round(lodLevels[manualLOD].scale * 100)}% scale)
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* LOD Levels Reference */}
      <div className="lod-reference">
        <h4>LOD Levels Reference</h4>
        <div className="lod-levels-list">
          {lodLevels.map((level, index) => (
            <div 
              key={index} 
              className={`lod-level-item ${metrics?.currentLevel === index ? 'active' : ''}`}
            >
              <div className="level-header">
                <span className="level-number">Level {level.level}</span>
                <span 
                  className="level-quality"
                  style={{ color: getQualityColor(level.quality) }}
                >
                  {level.quality}
                </span>
              </div>
              <div className="level-details">
                <span>Scale: {Math.round(level.scale * 100)}%</span>
                <span>Max Texture: {level.maxTextureSize}px</span>
              </div>
              <div className="level-description">
                {level.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .lod-control-toggle {
          position: fixed;
          top: 120px;
          right: 20px;
          z-index: 1000;
        }

        .lod-toggle-btn {
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .lod-toggle-btn:hover {
          background: rgba(0, 0, 0, 0.9);
          transform: scale(1.1);
        }

        .lod-control-panel {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 350px;
          max-height: 80vh;
          background: rgba(0, 0, 0, 0.9);
          color: white;
          border-radius: 8px;
          padding: 16px;
          z-index: 1000;
          overflow-y: auto;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 14px;
        }

        .lod-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          padding-bottom: 8px;
        }

        .lod-header h3 {
          margin: 0;
          font-size: 16px;
        }

        .lod-close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .lod-metrics {
          margin-bottom: 16px;
        }

        .lod-metrics h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #FFC107;
        }

        .metrics-grid {
          display: grid;
          gap: 8px;
        }

        .metric-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
        }

        .metric-label {
          color: #B0B0B0;
          font-size: 12px;
        }

        .metric-value {
          font-weight: bold;
          font-size: 12px;
        }

        .lod-controls {
          margin-bottom: 16px;
        }

        .control-group {
          margin-bottom: 12px;
        }

        .control-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          cursor: pointer;
        }

        .control-label input[type="checkbox"] {
          margin: 0;
        }

        .lod-slider-container {
          margin-top: 8px;
        }

        .lod-slider {
          width: 100%;
          margin-bottom: 8px;
        }

        .lod-level-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
        }

        .lod-quality {
          font-weight: bold;
          text-transform: capitalize;
        }

        .lod-scale {
          color: #B0B0B0;
        }

        .lod-reference h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #FFC107;
        }

        .lod-levels-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .lod-level-item {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          padding: 8px;
          transition: all 0.3s ease;
        }

        .lod-level-item.active {
          background: rgba(76, 175, 80, 0.2);
          border: 1px solid #4CAF50;
        }

        .level-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .level-number {
          font-weight: bold;
          font-size: 12px;
        }

        .level-quality {
          font-size: 11px;
          text-transform: capitalize;
          font-weight: bold;
        }

        .level-details {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #B0B0B0;
          margin-bottom: 4px;
        }

        .level-description {
          font-size: 10px;
          color: #D0D0D0;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};