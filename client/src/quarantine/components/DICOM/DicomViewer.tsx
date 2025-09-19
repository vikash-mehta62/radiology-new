import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Paper, Button } from '@mui/material';
import { dicomServiceBlackImageFix } from '../../services/dicomService_BlackImageFix';
import { Study } from '../../types';
import DebugPanel from '../Debug/DebugPanel';
import * as cornerstone from 'cornerstone-core';

interface DicomViewerProps {
  study: Study;
}

const DicomViewer: React.FC<DicomViewerProps> = ({ study }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('Initializing...');
  interface DebugInfo {
    timestamp: string;
    study: any;
    imageId: string | null;
    loadingSteps: Array<{ step: string; timestamp: string; imageId?: string; error?: string }>;
    errors: Array<{ error: string; timestamp: string; details: any }>;
  }
  
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    timestamp: new Date().toISOString(),
    study: null,
    imageId: null,
    loadingSteps: [],
    errors: []
  });

  const loadImage = async (imageId: string) => {
    console.log('🖼️ [DicomViewer.loadImage] Starting to load image:', imageId);
    
    if (!elementRef.current) {
      const errorMsg = 'Canvas element not available for image loading';
      console.error('❌ [DicomViewer.loadImage] elementRef.current is null');
      setError(errorMsg);
      setStatusMessage(errorMsg);
      setDebugInfo(prev => ({
        ...prev,
        errors: [...prev.errors, { error: errorMsg, timestamp: new Date().toISOString(), details: { imageId } }]
      }));
      return;
    }

    try {
      console.log('🎯 Starting image load process for:', imageId);
      setStatusMessage('Starting image load...');
      setError(null); // Clear any previous errors
      
      // Add loading step to debug info
      setDebugInfo(prev => ({
        ...prev,
        imageId,
        loadingSteps: [...prev.loadingSteps, { step: 'image_load_started', timestamp: new Date().toISOString(), imageId }]
      }));
      
      // Load the image with timeout
      setStatusMessage('Loading image data...');
      console.log('🔄 Calling dicomServiceBlackImageFix.loadImage with ID:', imageId);
      
      // Add timeout for image loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Image loading timeout (30 seconds)')), 30000);
      });
      
      const loadPromise = dicomServiceBlackImageFix.loadImage(imageId);
      const image = await Promise.race([loadPromise, timeoutPromise]);
      
      if (!image) {
        throw new Error('Image loading returned null or undefined');
      }
      
      setDebugInfo(prev => ({
        ...prev,
        loadingSteps: [...prev.loadingSteps, { step: 'image_loaded', timestamp: new Date().toISOString(), imageId }]
      }));
      
      console.log('✅ Image loaded successfully:', {
        imageId: image.imageId,
        dimensions: `${image.width}x${image.height}`,
        pixelData: !!image.getPixelData
      });
      
      // Display the image
      setStatusMessage('Displaying image on canvas...');
      console.log('🖼️ About to display image on element:', {
        element: elementRef.current.tagName,
        dimensions: `${elementRef.current.offsetWidth}x${elementRef.current.offsetHeight}`
      });
      await dicomServiceBlackImageFix.displayImage(elementRef.current, imageId);
      console.log('✅ Image displayed successfully on element');
      
      setStatusMessage('Image loaded and displayed successfully!');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('❌ [DicomViewer.loadImage] Failed to load image:', err);
      console.error('❌ [DicomViewer.loadImage] Error details:', {
        message: errorMessage,
        stack: err instanceof Error ? err.stack : 'No stack trace',
        imageId,
        elementAvailable: !!elementRef.current
      });
      
      // Provide specific error messages for common issues
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('timeout')) {
        userFriendlyMessage = 'Image loading timed out. The DICOM file may be too large or the server is not responding.';
      } else if (errorMessage.includes('404')) {
        userFriendlyMessage = 'DICOM file not found. The file may have been moved or deleted.';
      } else if (errorMessage.includes('CORS')) {
        userFriendlyMessage = 'Cross-origin request blocked. Please check server CORS configuration.';
      } else if (errorMessage.includes('network')) {
        userFriendlyMessage = 'Network error. Please check your internet connection and try again.';
      }
      
      setError(`Image loading failed: ${userFriendlyMessage}`);
      setStatusMessage(`Error loading image: ${userFriendlyMessage}`);
      
      setDebugInfo(prev => ({
        ...prev,
        errors: [...prev.errors, {
          error: `Image loading failed: ${userFriendlyMessage}`,
          timestamp: new Date().toISOString(),
          details: { imageId, errorStack: err instanceof Error ? err.stack : 'No stack trace' }
        }]
      }));
      
      throw err;
    }
  };

  useEffect(() => {
    console.log('🚀 DicomViewer useEffect triggered with study:', study);
    console.log('📋 Current state:', { loading, error, statusMessage });
    
    // Add global error handler for this component
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('🚨 Global error caught:', event.error);
      setStatusMessage(`Global Error: ${event.error?.message || event.message}`);
      setError(`Global error: ${event.error?.message || event.message}`);
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('🚨 Unhandled promise rejection:', event.reason);
      setStatusMessage(`Promise Rejection: ${event.reason}`);
      setError(`Unhandled promise rejection: ${event.reason}`);
    };
    
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    const initializeViewer = async () => {
      const studyInfo = {
        patient_id: study.patient_id,
        study_uid: study.study_uid,
        study_date: study.study_date,
        modality: study.modality,
        image_urls: study.image_urls,
        image_urls_count: study.image_urls?.length || 0
      };
      
      console.log('🚀 [DicomViewer] Starting initialization...');
      console.log('📋 [DicomViewer] Received study:', studyInfo);
      
      setDebugInfo(prev => ({
        ...prev,
        study: studyInfo,
        loadingSteps: [...prev.loadingSteps, { step: 'initialization_started', timestamp: new Date().toISOString() }]
      }));
      
      // Wait for DOM element to be available with longer timeout
      let retryCount = 0;
      const maxRetries = 50; // Increased retries
      
      while (!elementRef.current && retryCount < maxRetries) {
        console.log(`⏳ [DicomViewer] Waiting for element (attempt ${retryCount + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 200)); // Longer wait
        retryCount++;
      }
      
      if (!elementRef.current) {
        console.error('❌ [DicomViewer] elementRef.current is null after retries');
        console.error('❌ [DicomViewer] DOM state:', {
          elementRef: elementRef,
          current: elementRef.current,
          document: typeof document !== 'undefined',
          readyState: typeof document !== 'undefined' ? document.readyState : 'unknown'
        });
        setError('Canvas element not available after waiting. Please try refreshing the page.');
        setStatusMessage('Error: Canvas element not available after waiting');
        setLoading(false);
        return;
      }
      
      console.log('✅ [DicomViewer] Element is now available:', elementRef.current);

      try {
        console.log('⏳ [DicomViewer] Setting loading state...');
        setLoading(true);
        setError(null);
        setStatusMessage('Starting DICOM viewer initialization...');

        console.log('🔧 [DicomViewer] Initializing DICOM service...');
        setStatusMessage('Initializing DICOM service...');
        console.log('🔧 DICOM Service State Before Init:', {
          initialized: (dicomServiceBlackImageFix as any).initialized,
          cornerstoneLoaded: typeof cornerstone !== 'undefined',
          elementRef: elementRef.current ? 'exists' : 'null'
        });
        
        // Test cornerstone basic functionality
        try {
          console.log('🧪 Testing cornerstone basic functions...');
          console.log('🧪 Cornerstone methods available:', {
            enable: typeof cornerstone.enable,
            loadImage: typeof cornerstone.loadImage,
            displayImage: typeof cornerstone.displayImage,
            getEnabledElement: typeof cornerstone.getEnabledElement
          });
          
          // Check if cornerstone methods are available
          if (typeof cornerstone.enable !== 'function') {
            throw new Error('cornerstone.enable is not available');
          }
          if (typeof cornerstone.loadImage !== 'function') {
            throw new Error('cornerstone.loadImage is not available');
          }
          console.log('✅ [DicomViewer] Cornerstone methods are available');
          setStatusMessage('Cornerstone library verified, initializing service...');
        } catch (cornerstoneTestError) {
          console.error('❌ Cornerstone test failed:', cornerstoneTestError);
          setStatusMessage(`Error: Cornerstone library issue - ${cornerstoneTestError}`);
          throw new Error(`Cornerstone library issue: ${cornerstoneTestError}`);
        }
        
        setDebugInfo(prev => ({
          ...prev,
          loadingSteps: [...prev.loadingSteps, { step: 'dicom_service_initializing', timestamp: new Date().toISOString() }]
        }));
        
        await dicomServiceBlackImageFix.initialize();
        
        console.log('✅ DICOM service initialized successfully');
        setStatusMessage('DICOM service initialized, enabling element...');
        console.log('🔧 DICOM Service State After Init:', {
          initialized: (dicomServiceBlackImageFix as any).initialized,
          cornerstoneEnabled: elementRef.current ? 'checking...' : 'no element'
        });
        
        // Test element enabling
        if (elementRef.current) {
          try {
            console.log('🧪 Testing element enabling...');
            console.log('🧪 Element details:', {
              tagName: elementRef.current.tagName,
              dimensions: `${elementRef.current.offsetWidth}x${elementRef.current.offsetHeight}`,
              isVisible: elementRef.current.offsetParent !== null,
              hasParent: !!elementRef.current.parentElement
            });
            
            // Try to enable the element
            cornerstone.enable(elementRef.current);
            console.log('✅ Element enabled successfully');
            setStatusMessage('Element enabled, verifying...');
            
            // Check if it's actually enabled
            const enabledElement = cornerstone.getEnabledElement(elementRef.current);
            console.log('✅ Element verification:', {
              canvas: !!enabledElement.canvas,
              element: !!enabledElement.element,
              hasViewport: !!enabledElement.viewport
            });
            setStatusMessage('Element verified, preparing to load image...');
            
          } catch (enableError) {
            console.error('❌ Element enabling failed:', enableError);
            setStatusMessage(`Error: Element enabling failed - ${enableError}`);
            throw new Error(`Element enabling failed: ${enableError}`);
          }
        }
        
        setDebugInfo(prev => ({
          ...prev,
          loadingSteps: [...prev.loadingSteps, { step: 'dicom_service_initialized', timestamp: new Date().toISOString() }]
        }));

        // Check if we have uploaded DICOM files to display
        let imageId: string;
        if (study.image_urls && study.image_urls.length > 0) {
          // Set total images count
          setTotalImages(study.image_urls.length);
          
          // Use the current image index (default to first image)
          const currentUrl = study.image_urls[currentImageIndex] || study.image_urls[0];
          imageId = currentUrl.startsWith('wadouri:') 
            ? currentUrl 
            : `wadouri:${currentUrl}`;
          console.log('🖼️ [DicomViewer] Using uploaded DICOM file:', imageId);
          console.log('📁 [DicomViewer] Available image URLs:', study.image_urls);
          console.log('📍 [DicomViewer] Current image index:', currentImageIndex, 'of', study.image_urls.length);
          setStatusMessage(`Loading uploaded DICOM file ${currentImageIndex + 1}/${study.image_urls.length}: ${currentUrl.split('/').pop()}`);
        } else {
          // Fallback to sample image if no uploaded files
          setTotalImages(1);
          imageId = `sample:test-image-${study.study_uid}`;
          console.log('🧪 [DicomViewer] No uploaded files found, using sample image:', imageId);
          setStatusMessage('No uploaded files found, using sample image for testing...');
        }
        
        console.log('🔍 [DicomViewer] Final imageId to load:', imageId);
        console.log('📡 [DicomViewer] About to call loadImage with imageId:', imageId);
        console.log('🔧 Element state before loading:', {
          elementExists: !!elementRef.current,
          elementDimensions: elementRef.current ? `${elementRef.current.offsetWidth}x${elementRef.current.offsetHeight}` : 'N/A',
          elementVisible: elementRef.current ? elementRef.current.offsetParent !== null : false
        });
        
        setDebugInfo(prev => ({
          ...prev,
          imageId: imageId,
          loadingSteps: [...prev.loadingSteps, { step: 'image_loading_started', imageId, timestamp: new Date().toISOString() }]
        }));

        console.log('📡 [DicomViewer] Loading image...');
        setStatusMessage('Loading DICOM image...');
        
        // Add timeout to detect hanging loads
        const loadTimeout = setTimeout(() => {
          console.warn('⚠️ [DicomViewer] Image loading is taking longer than expected (10s)');
          console.log('🔧 Current loading state:', {
            imageId,
            elementStillExists: !!elementRef.current,
            timestamp: new Date().toISOString()
          });
          setError('Image load timeout - please check network connection');
          setStatusMessage('Error: Image load timeout');
          setLoading(false);
          setDebugInfo(prev => ({
            ...prev,
            loadingSteps: [...prev.loadingSteps, { step: 'loading_timeout_warning', timestamp: new Date().toISOString(), imageId }]
          }));
        }, 30000);
        
        try {
          console.log('🎯 [DicomViewer] About to call loadImage function...');
          await loadImage(imageId);
          clearTimeout(loadTimeout);
          console.log('✅ [DicomViewer] Complete initialization successful');
          setDebugInfo(prev => ({
            ...prev,
            loadingSteps: [...prev.loadingSteps, { step: 'image_displayed_successfully', timestamp: new Date().toISOString(), imageId }]
          }));
        } catch (loadError) {
          clearTimeout(loadTimeout);
          console.error('❌ [DicomViewer] Image loading failed:', loadError);
          const errorDetails = loadError instanceof Error ? {
            message: loadError.message,
            stack: loadError.stack,
            name: loadError.name
          } : { message: String(loadError) };
          console.error('❌ Error details:', errorDetails);
          setStatusMessage(`Error: Image load failed - ${loadError}`);
          setDebugInfo(prev => ({
            ...prev,
            loadingSteps: [...prev.loadingSteps, { step: 'image_load_failed', timestamp: new Date().toISOString(), imageId, error: errorDetails.message }]
          }));
          throw loadError;
        }
        
        console.log('🎉 [DicomViewer] Initialization complete, setting loading to false');
        setLoading(false);
      } catch (err) {
        console.error('❌ [DicomViewer] Initialization failed:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize DICOM viewer';
        
        setDebugInfo(prev => ({
          ...prev,
          errors: [...prev.errors, { error: errorMessage, timestamp: new Date().toISOString(), details: err }],
          loadingSteps: [...prev.loadingSteps, { step: 'initialization_failed', error: errorMessage, timestamp: new Date().toISOString() }]
        }));
        
        setError(errorMessage);
        setStatusMessage(`Error: ${errorMessage}`);
        setLoading(false);
      }
    };

    initializeViewer();
    
    // Cleanup global error handlers
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      
      if (elementRef.current) {
        try {
          dicomServiceBlackImageFix.disableElement(elementRef.current);
        } catch (err) {
          console.warn('Error disabling DICOM element:', err);
        }
      }
    };
  }, [study]);

  // Effect to load new image when currentImageIndex changes
  useEffect(() => {
    if (!study || !study.image_urls || study.image_urls.length === 0) return;
    
    console.log('🔄 Image index changed, loading new image...', currentImageIndex);
    
    const loadNewImage = async () => {
        if (!elementRef.current || !study.image_urls) return;
        
        const currentUrl = study.image_urls[currentImageIndex];
        const imageId = currentUrl.startsWith('wadouri:') 
          ? currentUrl 
          : `wadouri:${currentUrl}`;
        
        try {
          setLoading(true);
          setError(null);
          setStatusMessage(`Loading image ${currentImageIndex + 1}/${study.image_urls.length}...`);
          
          // Check if file exists before loading
          const response = await fetch(currentUrl, { method: 'HEAD' });
          if (!response.ok) {
            throw new Error(`DICOM file not found or inaccessible: ${response.status} ${response.statusText}`);
          }
          
          await loadImage(imageId);
          setLoading(false);
          setStatusMessage(`Successfully loaded image ${currentImageIndex + 1}/${study.image_urls.length}`);
        } catch (err) {
          console.error('❌ Failed to load new image:', err);
          const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
          setError(`Failed to load image ${currentImageIndex + 1}/${study.image_urls.length}: ${errorMessage}`);
          setStatusMessage(`Error loading image ${currentImageIndex + 1}/${study.image_urls.length}`);
          setLoading(false);
        }
      };
    
    loadNewImage();
  }, [currentImageIndex, study]);

  return (
    <Box sx={{ p: 2 }}>
      {/* Debug Status */}
      <Box sx={{ mb: 2, p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
          🔍 Debug: Component Loaded | Loading: {loading ? 'Yes' : 'No'} | Error: {error ? 'Yes' : 'No'}
        </Typography>
        <br />
        <Typography variant="caption">
          Status: {statusMessage}
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6">Error Details:</Typography>
          <Typography variant="body2">{error}</Typography>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Check the debug panel below for more information.
          </Typography>
        </Alert>
      )}
      
      <Paper sx={{ p: 2, mb: 2, bgcolor: loading ? 'action.hover' : 'background.paper' }}>
         <Typography variant="h6" gutterBottom>
           Status: {loading ? '🔄 Loading...' : error ? '❌ Error' : '✅ Ready'}
         </Typography>
         <Typography variant="body2" color="text.secondary">
           {statusMessage}
         </Typography>
         {study && (
           <Box sx={{ mt: 1 }}>
             <Typography variant="caption" display="block">
               Study: {study.patient_id} | UID: {study.study_uid}
             </Typography>
             <Typography variant="caption" display="block">
               Images: {study.image_urls?.length || 0} | Current: {currentImageIndex + 1}
             </Typography>
           </Box>
         )}
         
         {/* Image Navigation Controls */}
         {totalImages > 1 && (
           <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
             <Button 
               variant="outlined"
               size="small"
               onClick={() => {
                 const newIndex = Math.max(0, currentImageIndex - 1);
                 setCurrentImageIndex(newIndex);
                 console.log('⬅️ Previous image:', newIndex);
               }}
               disabled={loading || currentImageIndex === 0}
             >
               ⬅️ Previous
             </Button>
             
             <Typography variant="body2" sx={{ mx: 2 }}>
               Image {currentImageIndex + 1} of {totalImages}
             </Typography>
             
             <Button 
               variant="outlined"
               size="small"
               onClick={() => {
                 const newIndex = Math.min(totalImages - 1, currentImageIndex + 1);
                 setCurrentImageIndex(newIndex);
                 console.log('➡️ Next image:', newIndex);
               }}
               disabled={loading || currentImageIndex === totalImages - 1}
             >
               Next ➡️
             </Button>
           </Box>
         )}
         
         <Box sx={{ mt: 2 }}>
            <Button 
              variant="contained" 
              size="small"
              onClick={async () => {
                setError(null);
                setLoading(true);
                setStatusMessage('Testing cornerstone library...');
                try {
                  console.log('🧪 Testing cornerstone library availability...');
                  
                  // Test cornerstone basic functions
                  console.log('🧪 Cornerstone object:', cornerstone);
                  console.log('🧪 Cornerstone methods:', {
                    enable: typeof cornerstone.enable,
                    loadImage: typeof cornerstone.loadImage,
                    displayImage: typeof cornerstone.displayImage
                  });
                  
                  if (!elementRef.current) {
                    throw new Error('Canvas element not available');
                  }
                  
                  // Try to enable the element
                  console.log('🧪 Enabling cornerstone element...');
                  cornerstone.enable(elementRef.current);
                  
                  console.log('🧪 Element enabled successfully');
                  
                  // Test DICOM service initialization
                  console.log('🧪 Testing DICOM service initialization...');
                  await dicomServiceBlackImageFix.initialize();
                  
                  console.log('🧪 DICOM service initialized successfully');
                  
                  // Try to load the test image
                  const testImageId = 'wadouri:http://localhost:8000/uploads/dicom/PAT001/MRBRAIN.DCM';
                  console.log('🧪 Loading test image:', testImageId);
                  
                  const image = await cornerstone.loadImage(testImageId);
                  console.log('🧪 Image loaded:', image);
                  
                  cornerstone.displayImage(elementRef.current, image);
                  console.log('🧪 Image displayed successfully');
                  
                  setStatusMessage('All tests passed! DICOM viewer is working.');
                  setLoading(false);
                } catch (err) {
                  console.error('🧪 Test failed:', err);
                  setError(`Test failed: ${err}`);
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              🧪 Test Cornerstone & DICOM
            </Button>
            <Button 
              variant="outlined"
              size="small"
              sx={{ ml: 1 }}
              onClick={async () => {
                setError(null);
                setLoading(true);
                setStatusMessage('Testing sample image display...');
                try {
                  console.log('🧪 Testing sample image display...');
                  
                  if (!elementRef.current) {
                    throw new Error('Canvas element not available');
                  }
                  
                  // Initialize DICOM service
                  await dicomServiceBlackImageFix.initialize();
                  
                  // Enable element
                  cornerstone.enable(elementRef.current);
                  
                  // Create and display sample image directly
                  const sampleImageId = 'sample:direct-test';
                  console.log('🧪 Loading sample image:', sampleImageId);
                  await dicomServiceBlackImageFix.displayImage(elementRef.current, sampleImageId);
                  
                  setStatusMessage('Sample image displayed successfully!');
                  setLoading(false);
                } catch (err) {
                  console.error('🧪 Sample image test failed:', err);
                  setError(`Sample image test failed: ${err}`);
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              🎨 Test Sample Image
            </Button>
          </Box>
       </Paper>
      
      {loading && (
        <Box display="flex" alignItems="center" justifyContent="center" minHeight={200}>
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            {statusMessage}
          </Typography>
        </Box>
      )}
      
      {error && (
         <Box sx={{ mb: 2 }}>
           <Button onClick={() => window.location.reload()} sx={{ mr: 1 }}>
             Retry
           </Button>
           <Button 
             variant="outlined" 
             onClick={async () => {
               setError(null);
               setLoading(true);
               setStatusMessage('Testing direct DICOM file load...');
               try {
                 const testImageId = 'wadouri:http://localhost:8000/uploads/dicom/PAT001/MRBRAIN.DCM';
                 console.log('🧪 Testing direct DICOM load:', testImageId);
                 await loadImage(testImageId);
                 setStatusMessage('Direct DICOM test successful!');
                 setLoading(false);
               } catch (err) {
                 console.error('🧪 Direct DICOM test failed:', err);
                 setError(`Direct DICOM test failed: ${err}`);
                 setLoading(false);
               }
             }}
           >
             Test Direct DICOM Load
           </Button>
         </Box>
       )}
      
      <DebugPanel title={error ? "DICOM Viewer Error Debug" : "DICOM Viewer Debug"} data={debugInfo} />
      
      {/* Always render the canvas element - show it even during loading */}
      <Paper sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        opacity: (loading || error) ? 0.5 : 1,
        position: 'relative'
      }}>
        <Box sx={{ flexGrow: 1, position: 'relative', bgcolor: 'black', minHeight: '400px' }}>
          <div
            ref={elementRef}
            style={{
              width: '100%',
              height: '100%',
              position: 'relative',
              minHeight: '400px'
            }}
          />
          
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              color: '#00ff00',
              fontFamily: 'monospace',
              fontSize: '12px',
              pointerEvents: 'none',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            }}
          >
            <div>Patient: {study.patient_id}</div>
            <div>Study: {study.study_date}</div>
            <div>Modality: {study.modality}</div>
          </Box>
        </Box>
      </Paper>
    </Box>
  );


};

export default DicomViewer;