import React, { useState, useRef, useCallback } from 'react';
import { RawPixelRenderer } from '../core/RawPixelRenderer';
import { enhancedDicomService } from '../../../services/enhancedDicomService';
import './RawPixelTestPage.css';

interface TestImage {
  patientId: string;
  filename: string;
  displayName: string;
}

const testImages: TestImage[] = [
  { patientId: 'PAT001', filename: '0002.DCM', displayName: 'PAT001 - 0002.DCM' },
  { patientId: 'PAT001', filename: '1234.DCM', displayName: 'PAT001 - 1234.DCM' },
  { patientId: 'New_23', filename: 'image.dcm', displayName: 'New_23 - image.dcm' },
];

export const RawPixelTestPage: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<TestImage>(testImages[0]);
  const [windowCenter, setWindowCenter] = useState<number>(128);
  const [windowWidth, setWindowWidth] = useState<number>(256);
  const [frame, setFrame] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [renderTime, setRenderTime] = useState<number | null>(null);
  const [imageInfo, setImageInfo] = useState<any>(null);

  const rendererRef = useRef<any>(null);

  const handleLoadImage = useCallback(async () => {
    if (!selectedImage) return;

    setIsLoading(true);
    setError(null);
    setRenderTime(null);
    setImageInfo(null);

    const startTime = performance.now();

    try {
      // Test the raw pixel data loading directly
      const imageId = `dicom:${selectedImage.patientId}/${selectedImage.filename}`;
      const result = await enhancedDicomService.loadRawPixelData(
        imageId,
        frame,
        windowCenter,
        windowWidth
      );

      setImageInfo({
        dimensions: `${result.metadata.width}x${result.metadata.height}`,
        pixelFormat: result.metadata.pixelFormat,
        dataSize: result.rawData.byteLength,
        bytesPerPixel: result.metadata.bytes_per_pixel
      });

      const endTime = performance.now();
      setRenderTime(endTime - startTime);

    } catch (err) {
      console.error('Failed to load raw pixel data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [selectedImage, frame, windowCenter, windowWidth]);

  const handleRefreshRenderer = useCallback(() => {
    if (rendererRef.current?.refresh) {
      rendererRef.current.refresh();
    }
  }, []);

  const handleUpdateWindowing = useCallback(() => {
    if (rendererRef.current?.updateWindowing) {
      rendererRef.current.updateWindowing(windowCenter, windowWidth);
    }
  }, [windowCenter, windowWidth]);

  const handleExportImage = useCallback(() => {
    if (rendererRef.current?.exportAsImage) {
      const dataUrl = rendererRef.current.exportAsImage();
      const link = document.createElement('a');
      link.download = `${selectedImage.patientId}_${selectedImage.filename}_frame${frame}.png`;
      link.href = dataUrl;
      link.click();
    }
  }, [selectedImage, frame]);

  return (
    <div className="raw-pixel-test-page">
      <div className="test-header">
        <h1>🧪 Raw Pixel Data Rendering Test</h1>
        <p>Testing Web Worker-based DICOM rendering with raw pixel data</p>
      </div>

      <div className="test-controls">
        <div className="control-group">
          <label htmlFor="image-select">Test Image:</label>
          <select
            id="image-select"
            value={`${selectedImage.patientId}/${selectedImage.filename}`}
            onChange={(e) => {
              const [patientId, filename] = e.target.value.split('/');
              const image = testImages.find(img => img.patientId === patientId && img.filename === filename);
              if (image) setSelectedImage(image);
            }}
          >
            {testImages.map((image) => (
              <option key={`${image.patientId}/${image.filename}`} value={`${image.patientId}/${image.filename}`}>
                {image.displayName}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="frame-input">Frame:</label>
          <input
            id="frame-input"
            type="number"
            min="0"
            max="100"
            value={frame}
            onChange={(e) => setFrame(parseInt(e.target.value) || 0)}
          />
        </div>

        <div className="control-group">
          <label htmlFor="window-center">Window Center:</label>
          <input
            id="window-center"
            type="number"
            value={windowCenter}
            onChange={(e) => setWindowCenter(parseInt(e.target.value) || 128)}
          />
        </div>

        <div className="control-group">
          <label htmlFor="window-width">Window Width:</label>
          <input
            id="window-width"
            type="number"
            value={windowWidth}
            onChange={(e) => setWindowWidth(parseInt(e.target.value) || 256)}
          />
        </div>

        <div className="control-buttons">
          <button onClick={handleLoadImage} disabled={isLoading}>
            {isLoading ? '🔄 Loading...' : '📸 Load Raw Data'}
          </button>
          <button onClick={handleRefreshRenderer}>
            🔄 Refresh Renderer
          </button>
          <button onClick={handleUpdateWindowing}>
            🎛️ Update Windowing
          </button>
          <button onClick={handleExportImage}>
            💾 Export Image
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <h3>❌ Error</h3>
          <p>{error}</p>
        </div>
      )}

      {renderTime && (
        <div className="performance-info">
          <h3>⚡ Performance</h3>
          <p>Raw data load time: <strong>{renderTime.toFixed(2)}ms</strong></p>
        </div>
      )}

      {imageInfo && (
        <div className="image-info">
          <h3>📊 Image Information</h3>
          <ul>
            <li>Dimensions: <strong>{imageInfo.dimensions}</strong></li>
            <li>Pixel Format: <strong>{imageInfo.pixelFormat}</strong></li>
            <li>Data Size: <strong>{(imageInfo.dataSize / 1024).toFixed(2)} KB</strong></li>
            <li>Bytes per Pixel: <strong>{imageInfo.bytesPerPixel}</strong></li>
          </ul>
        </div>
      )}

      <div className="renderer-container">
        <h3>🖼️ Web Worker Renderer</h3>
        <div className="renderer-wrapper">
          <RawPixelRenderer
            ref={rendererRef}
            patientId={selectedImage.patientId}
            filename={selectedImage.filename}
            frame={frame}
            windowCenter={windowCenter}
            windowWidth={windowWidth}
            onLoadStart={() => {
              console.log('🔄 Renderer load started');
            }}
            onLoadComplete={(info) => {
              console.log('✅ Renderer load completed:', info);
            }}
            onRenderComplete={(renderInfo) => {
              console.log('🎨 Render completed:', renderInfo);
            }}
            onError={(error) => {
              console.error('❌ Renderer error:', error);
              setError(error.message);
            }}
          />
        </div>
      </div>

      <div className="comparison-section">
        <h3>📈 Performance Comparison</h3>
        <p>Compare the Web Worker-based rendering with traditional Base64 approach:</p>
        <div className="comparison-buttons">
          <button onClick={() => window.open('/test-slice-display.html', '_blank')}>
            🔗 Open Traditional Viewer
          </button>
          <button onClick={() => window.open('/enhanced-viewer-test', '_blank')}>
            🔗 Open Enhanced Viewer
          </button>
        </div>
      </div>

      <div className="technical-details">
        <h3>🔧 Technical Details</h3>
        <ul>
          <li>✅ Direct PNG serving endpoint (eliminates Base64 overhead)</li>
          <li>✅ Raw pixel data endpoint for client-side rendering</li>
          <li>✅ Web Worker-based pixel processing</li>
          <li>✅ HTML Canvas rendering with ImageBitmap</li>
          <li>✅ Configurable windowing parameters</li>
          <li>✅ Performance monitoring and benchmarking</li>
        </ul>
      </div>
    </div>
  );
};

export default RawPixelTestPage;