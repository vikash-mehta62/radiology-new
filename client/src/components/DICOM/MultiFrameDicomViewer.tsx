import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    Box, Typography, Paper, IconButton, Tooltip, 
    Grid, Chip, Button, Alert, LinearProgress,
    Stack, useMediaQuery, useTheme, Slider
} from '@mui/material';
import {
    ZoomIn, ZoomOut, RotateLeft, RotateRight, 
    RestartAlt, Fullscreen, PlayArrow, 
    Pause, SkipNext, SkipPrevious, Speed
} from '@mui/icons-material';
import type { Study } from '../../types';
import { dicomService } from '../../services/dicomService';
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import * as dicomParser from 'dicom-parser';

// Initialize cornerstone WADO image loader
(cornerstoneWADOImageLoader as any).external.cornerstone = cornerstone;
(cornerstoneWADOImageLoader as any).external.dicomParser = dicomParser;

// Configure WADO image loader with proper error handling
try {
    (cornerstoneWADOImageLoader as any).configure({
        useWebWorkers: false, // Disable web workers to avoid issues
        decodeConfig: {
            convertFloatPixelDataToInt: false,
            convertColorspaceToRGB: false
        },
        // Add proper XMLHttpRequest configuration
        beforeSend: function (xhr: XMLHttpRequest) {
            // Set proper headers for DICOM files
            xhr.setRequestHeader('Accept', 'application/dicom, */*');
            xhr.setRequestHeader('Cache-Control', 'no-cache');
            // Set timeout to prevent hanging requests
            xhr.timeout = 30000; // 30 seconds
            // Enable credentials for CORS if needed
            xhr.withCredentials = false;
        },
        // Add error handling for XMLHttpRequest
        errorInterceptor: function (error: any) {
            console.group('🔴 [MultiFrameDicomViewer] DICOM Loading Error Intercepted');
            console.error('Error object:', error);
            
            // Log XMLHttpRequest specific details
            if (error && error.request) {
                const xhr = error.request;
                console.log('XMLHttpRequest Details:');
                console.log('- Status:', xhr.status);
                console.log('- Status Text:', xhr.statusText);
                console.log('- Ready State:', xhr.readyState);
                console.log('- Response URL:', xhr.responseURL);
                console.log('- Response Type:', xhr.responseType);
                console.log('- Timeout:', xhr.timeout);
                console.log('- With Credentials:', xhr.withCredentials);
                
                // Log response headers if available
                try {
                    const responseHeaders = xhr.getAllResponseHeaders();
                    console.log('- Response Headers:', responseHeaders);
                } catch (e) {
                    console.log('- Response Headers: Unable to retrieve');
                }
                
                // Log response text/data if available
                try {
                    if (xhr.responseText) {
                        console.log('- Response Text (first 200 chars):', xhr.responseText.substring(0, 200));
                    }
                } catch (e) {
                    console.log('- Response Text: Unable to retrieve');
                }
            }
            
            // Log error properties
            if (error) {
                console.log('Error Properties:');
                console.log('- Message:', error.message);
                console.log('- Name:', error.name);
                console.log('- Stack:', error.stack);
                console.log('- Type:', typeof error);
                
                // Log all enumerable properties
                const errorProps = Object.getOwnPropertyNames(error);
                console.log('- All Properties:', errorProps);
                errorProps.forEach(prop => {
                    try {
                        console.log(`  - ${prop}:`, error[prop]);
                    } catch (e) {
                        console.log(`  - ${prop}: Unable to access`);
                    }
                });
            }
            
            console.groupEnd();
            return error;
        }
    });
    console.log('✅ [MultiFrameDicomViewer] WADO image loader configured successfully');
} catch (configError) {
    console.error('❌ [MultiFrameDicomViewer] Failed to configure WADO image loader:', configError);
}

// Register image loaders - CRITICAL: This must happen at module level, not inside component
try {
    // Check if already registered to avoid duplicate registration
    if (!(cornerstone as any).imageLoaders || !(cornerstone as any).imageLoaders['wadouri']) {
        (cornerstone as any).registerImageLoader('wadouri', (cornerstoneWADOImageLoader as any).wadouri.loadImage);
        console.log('✅ [MultiFrameDicomViewer] WADO image loader registered successfully');
    } else {
        console.log('✅ [MultiFrameDicomViewer] WADO image loader already registered');
    }
} catch (registrationError) {
    console.error('❌ [MultiFrameDicomViewer] Failed to register WADO image loader:', registrationError);
}

interface MultiFrameDicomViewerProps {
    study: Study;
    onError?: (error: string) => void;
}

const MultiFrameDicomViewer: React.FC<MultiFrameDicomViewerProps> = ({ study, onError }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const currentImageRef = useRef<HTMLImageElement | null>(null);
    
    // Responsive design
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    // Core states
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [imageLoaded, setImageLoaded] = useState(false);
    
    // Image manipulation
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    
    // Multi-slice support (updated to match AdvancedMedicalDicomViewer)
    const [loadedImages, setLoadedImages] = useState<any[]>([]);
    const [currentSlice, setCurrentSlice] = useState(0);
    const [totalSlices, setTotalSlices] = useState(1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playSpeed, setPlaySpeed] = useState(2); // Slices per second
    const [autoScroll, setAutoScroll] = useState(false);
    
    // Build image URL properly with debugging
    const buildImageUrl = useCallback((filename: string | null | undefined) => {
        if (!filename || typeof filename !== 'string') {
            console.warn('buildImageUrl: Invalid filename provided:', filename);
            return null;
        }
        
        // Handle full HTTP URLs
        if (filename.startsWith('http://') || filename.startsWith('https://')) {
            return filename;
        } else if (filename.startsWith('/uploads/')) {
            return `http://localhost:8000${filename}`;
        } else if (filename.startsWith('/')) {
            return `http://localhost:8000${filename}`;
        } else {
            // Assume it's a relative path that needs /uploads/ prefix
            return `http://localhost:8000/uploads/${filename}`;
        }
    }, []);

    // Load a single image with error handling
    const loadSingleImage = useCallback(async (url: string): Promise<HTMLImageElement | null> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                resolve(img);
            };
            
            img.onerror = async (error) => {
                // Try to get more info about the error
                try {
                    const response = await fetch(url, { method: 'HEAD' });
                } catch (fetchError) {
                    // Silent fail for production
                }
                resolve(null);
            };
            
            img.src = url;
        });
    }, []);
    
    // Helper function to load a single image with detailed error reporting
    const tryLoadMedicalImage = useCallback((url: string): Promise<boolean> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                console.log('✅ Fallback image loaded successfully:', url);
                console.log('📐 Image dimensions:', img.width, 'x', img.height);
                currentImageRef.current = img;
                setImageLoaded(true);
                resolve(true);
            };

            img.onerror = (error) => {
                console.log('❌ Failed to load fallback image:', url);
                console.log('❌ Error details:', error);
                
                // Try to fetch the URL to see what the actual error is
                fetch(url, { method: 'HEAD' })
                    .then(response => {
                        console.log(`📊 HTTP status for ${url}:`, response.status, response.statusText);
                        if (!response.ok) {
                            console.log('❌ HTTP error:', response.status, response.statusText);
                        }
                    })
                    .catch(fetchError => {
                        console.log('❌ Fetch error for', url, ':', fetchError.message);
                    });
                
                resolve(false);
            };

            console.log('🔄 Attempting to load fallback image:', url);
            img.src = url;
        });
    }, []);
    
    // Draw image to canvas with transformations
    const drawImage = useCallback((img: HTMLImageElement) => {
        const canvas = canvasRef.current;
        if (!canvas || !img) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size to container
        const container = containerRef.current;
        if (container) {
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
        }

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Save context for transformations
        ctx.save();

        // Apply transformations
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        ctx.translate(centerX + pan.x, centerY + pan.y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom, zoom);

        // Calculate image dimensions to fit canvas
        const imgAspect = img.width / img.height;
        const canvasAspect = canvas.width / canvas.height;
        
        let drawWidth = img.width;
        let drawHeight = img.height;
        
        if (imgAspect > canvasAspect) {
            drawWidth = canvas.width * 0.8;
            drawHeight = drawWidth / imgAspect;
        } else {
            drawHeight = canvas.height * 0.8;
            drawWidth = drawHeight * imgAspect;
        }

        // Draw image centered
        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

        // Restore context
        ctx.restore();

        // Draw slice information
        ctx.fillStyle = '#00ff00';
        ctx.font = '14px monospace';
        ctx.fillText(`Slice: ${currentSlice + 1}/${totalSlices}`, 10, 30);
        ctx.fillText(`Zoom: ${Math.round(zoom * 100)}%`, 10, 50);
        
    }, [zoom, rotation, pan, currentSlice, totalSlices]);
    
    // Load DICOM images using our backend API
    const loadDicomImages = useCallback(async () => {
        if (!study?.patient_id || !study?.original_filename) {
            setError('No DICOM file specified');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log('🔄 Loading DICOM slices from backend API...');
            console.log('Patient ID:', study.patient_id);
            console.log('Filename:', study.original_filename);

            // Call our backend API to get all slices (without frame parameter)
            const apiUrl = `http://localhost:8000/api/dicom/process/${study.patient_id}/${study.original_filename}?output_format=PNG&max_slices=96`;
            console.log('🔄 API URL:', apiUrl);

            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ API Response received:', result);

            if (!result.success) {
                throw new Error(result.error || 'Failed to process DICOM file');
            }

            // Check if we have slices data
            if (!result.slices || !Array.isArray(result.slices)) {
                throw new Error('No slices data received from API');
            }

            console.log(`📊 Received ${result.slices.length} slices from API`);
            console.log(`📊 Total slices available: ${result.total_slices_extracted || result.slices.length}`);

            // Convert base64 images to Image objects
            const imagePromises = result.slices.map((slice: any, index: number) => {
                return new Promise<HTMLImageElement>((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        console.log(`✅ Slice ${index + 1} loaded successfully`);
                        resolve(img);
                    };
                    img.onerror = (error) => {
                        console.error(`❌ Failed to load slice ${index + 1}:`, error);
                        reject(new Error(`Failed to load slice ${index + 1}`));
                    };
                    // Set the base64 image data
                    img.src = `data:image/png;base64,${slice.image_data}`;
                });
            });

            // Wait for all images to load
            const loadedImageElements = await Promise.all(imagePromises);
            console.log(`✅ All ${loadedImageElements.length} slices loaded successfully`);

            // Store the loaded images
            setLoadedImages(loadedImageElements);
            setTotalSlices(loadedImageElements.length);
            setCurrentSlice(0);

            // Draw the first image
            if (loadedImageElements.length > 0) {
                currentImageRef.current = loadedImageElements[0];
                drawImage(loadedImageElements[0]);
                setImageLoaded(true);
            }

        } catch (error) {
            console.group('🔴 [MultiFrameDicomViewer] Error loading DICOM');
            console.error('Study object:', study);
            console.error('Error object:', error);
            console.error('Error type:', typeof error);
            console.error('Error name:', (error as any)?.name);
            console.error('Error message:', (error as any)?.message);
            console.error('Error stack:', (error as any)?.stack);
            console.groupEnd();

            let errorMessage = 'Unknown error occurred';
            if (error instanceof Error) {
                if (error.message.includes('Failed to process DICOM file')) {
                    errorMessage = 'DICOM processing failed on server';
                } else if (error.message.includes('No slices data received')) {
                    errorMessage = 'No image data received from server';
                } else if (error.message.includes('API request failed')) {
                    errorMessage = 'Cannot connect to DICOM processing server';
                } else {
                    errorMessage = error.message;
                }
            }
            
            setError(`Failed to load DICOM: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    }, [study, buildImageUrl, tryLoadMedicalImage, drawImage]);

    // Initialize cornerstone when component mounts
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            try {
                console.log('🔄 Initializing cornerstone element');
                
                // Check if element is already enabled
                let isEnabled = false;
                try {
                    isEnabled = !!cornerstone.getEnabledElement(canvas);
                } catch (e) {
                    // Element not enabled
                    isEnabled = false;
                }
                
                if (!isEnabled) {
                    cornerstone.enable(canvas);
                    console.log('✅ Cornerstone element enabled');
                } else {
                    console.log('✅ Cornerstone element already enabled');
                }
                
                // Load DICOM images after initialization
                loadDicomImages();
                
            } catch (error) {
                console.error('❌ Error enabling cornerstone:', error);
                setError('Failed to initialize DICOM viewer');
            }
        }

        return () => {
            if (canvas) {
                try {
                    // Only disable if element is enabled
                    let isEnabled = false;
                    try {
                        const enabledElement = cornerstone.getEnabledElement(canvas);
                        isEnabled = !!enabledElement;
                    } catch (e) {
                        isEnabled = false;
                    }
                    
                    if (isEnabled) {
                        // Just disable the element directly - no need to clear image
                        cornerstone.disable(canvas);
                        console.log('✅ Cornerstone element disabled and cleaned up');
                    }
                } catch (error) {
                    console.error('❌ Error disabling cornerstone:', error);
                }
            }
            
            // Clear refs
            currentImageRef.current = null;
        };
    }, [loadDicomImages]);

    // Auto-scroll functionality for cine mode
    useEffect(() => {
        if (autoScroll && isPlaying && totalSlices > 1) {
            const interval = setInterval(() => {
                setCurrentSlice(prev => (prev + 1) % totalSlices);
            }, 1000 / playSpeed);
            return () => clearInterval(interval);
        }
    }, [autoScroll, isPlaying, playSpeed, totalSlices]);
    
    // Handle slice changes for multi-frame DICOMs
    useEffect(() => {
        if (loadedImages.length > 0 && canvasRef.current && totalSlices > 1) {
            // Use the loaded images array to display the current slice
            const currentImage = loadedImages[currentSlice];
            
            if (currentImage) {
                try {
                    // Draw the current slice directly
                    drawImage(currentImage);
                    console.log(`✅ Displayed slice ${currentSlice + 1}/${totalSlices}`);
                } catch (error) {
                    console.error('Error displaying slice:', error);
                }
            }
        }
    }, [currentSlice, loadedImages, totalSlices, drawImage]);
    
    // Mouse wheel scrolling for frame navigation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || totalSlices <= 1) return;
        
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            
            if (e.deltaY > 0) {
                // Scroll down - next slice
                setCurrentSlice(prev => Math.min(totalSlices - 1, prev + 1));
            } else {
                // Scroll up - previous slice
                setCurrentSlice(prev => Math.max(0, prev - 1));
            }
        };
        
        canvas.addEventListener('wheel', handleWheel);
        return () => canvas.removeEventListener('wheel', handleWheel);
    }, [totalSlices]);
    
    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    setCurrentSlice(prev => Math.max(0, prev - 1));
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    setCurrentSlice(prev => Math.min(totalSlices - 1, prev + 1));
                    break;
                case ' ':
                    e.preventDefault();
                    setIsPlaying(!isPlaying);
                    setAutoScroll(!isPlaying);
                    break;
                case 'Home':
                    e.preventDefault();
                    setCurrentSlice(0);
                    break;
                case 'End':
                    e.preventDefault();
                    setCurrentSlice(totalSlices - 1);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, totalSlices]);
    
    // Load DICOM data when study changes
    useEffect(() => {
        if (study) {
            loadDicomImages();
        }
    }, [study, loadDicomImages]);
    
    // Control handlers
    // Viewport control handlers
    const handleZoomIn = useCallback(() => {
        if (canvasRef.current) {
            try {
                const viewport = cornerstone.getViewport(canvasRef.current);
                if (viewport) {
                    viewport.scale = Math.min(viewport.scale * 1.2, 5);
                    cornerstone.setViewport(canvasRef.current, viewport);
                }
            } catch (e) {
                // Fallback to state-based zoom
                setZoom(prev => Math.min(prev * 1.2, 5));
            }
        }
    }, []);

    const handleZoomOut = useCallback(() => {
        if (canvasRef.current) {
            try {
                const viewport = cornerstone.getViewport(canvasRef.current);
                if (viewport) {
                    viewport.scale = Math.max(viewport.scale / 1.2, 0.2);
                    cornerstone.setViewport(canvasRef.current, viewport);
                }
            } catch (e) {
                // Fallback to state-based zoom
                setZoom(prev => Math.max(prev / 1.2, 0.2));
            }
        }
    }, []);

    const handleRotateLeft = useCallback(() => {
        if (canvasRef.current) {
            try {
                const viewport = cornerstone.getViewport(canvasRef.current);
                if (viewport) {
                    viewport.rotation = (viewport.rotation || 0) - 90;
                    cornerstone.setViewport(canvasRef.current, viewport);
                }
            } catch (e) {
                // Fallback to state-based rotation
                setRotation(prev => prev - 90);
            }
        }
    }, []);

    const handleRotateRight = useCallback(() => {
        if (canvasRef.current) {
            try {
                const viewport = cornerstone.getViewport(canvasRef.current);
                if (viewport) {
                    viewport.rotation = (viewport.rotation || 0) + 90;
                    cornerstone.setViewport(canvasRef.current, viewport);
                }
            } catch (e) {
                // Fallback to state-based rotation
                setRotation(prev => prev + 90);
            }
        }
    }, []);

    const handleReset = useCallback(() => {
        if (canvasRef.current) {
            try {
                const viewport = cornerstone.getViewport(canvasRef.current);
                if (viewport) {
                    viewport.scale = 1.0;
                    viewport.translation = { x: 0, y: 0 };
                    viewport.rotation = 0;
                    cornerstone.setViewport(canvasRef.current, viewport);
                }
            } catch (e) {
                // Fallback to state-based reset
                setZoom(1);
                setRotation(0);
                setPan({ x: 0, y: 0 });
            }
        }
    }, []);
    
    if (loading) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <LinearProgress sx={{ mb: 2 }} />
                <Typography>Loading DICOM data for {study.patient_id}...</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Study: {study.study_uid || study.original_filename}
                </Typography>
                {loadedImages.length > 0 && (
                    <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                        Loaded {loadedImages.length} slice{loadedImages.length !== 1 ? 's' : ''}
                    </Typography>
                )}
            </Box>
        );
    }
    
    if (error) {
        return (
            <Alert severity="error" sx={{ m: 2 }}>
                <Typography variant="h6">Error Loading DICOM</Typography>
                <Typography>{error}</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                    Study: {study.study_uid || study.original_filename}
                </Typography>
                <Typography variant="body2">
                    Patient: {study.patient_id}
                </Typography>
                <Typography variant="body2">
                    DICOM URL: {study.dicom_url || 'Not specified'}
                </Typography>
                <Typography variant="body2">
                    Original Filename: {study.original_filename || 'Not specified'}
                </Typography>
                {study.image_urls && (
                    <Typography variant="body2">
                        Available URLs: {Array.isArray(study.image_urls) ? study.image_urls.length : 'Invalid format'}
                    </Typography>
                )}
                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button 
                        variant="outlined" 
                        size="small" 
                        onClick={() => {
                            setError(null);
                            setLoading(true);
                            setTimeout(() => loadDicomImages(), 100);
                        }}
                    >
                        Retry Loading
                    </Button>
                    <Button 
                        variant="text" 
                        size="small" 
                        onClick={() => {
                            console.group('🔍 Debug Information');
                            console.log('Full study object:', study);
                            console.log('Study image_urls:', study.image_urls);
                            console.log('Study dicom_url:', study.dicom_url);
                            console.log('Study original_filename:', study.original_filename);
                            console.log('Current error:', error);
                            console.groupEnd();
                        }}
                    >
                        Debug Info
                    </Button>
                    <Button 
                        variant="text" 
                        size="small" 
                        onClick={() => {
                            // Test URL accessibility
                            const urlSource = study.dicom_url || study.original_filename;
                            if (urlSource) {
                                const testUrl = urlSource.startsWith('http') ? urlSource : `http://localhost:8000${urlSource.startsWith('/') ? '' : '/uploads/'}${urlSource}`;
                                window.open(testUrl, '_blank');
                            }
                        }}
                    >
                        Test URL
                    </Button>
                </Box>
            </Alert>
        );
    }
    
    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#000' }}>
            {/* Header */}
            <Paper sx={{ p: 1, bgcolor: '#1a1a1a', color: '#00ff00' }}>
                <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} md={8}>
                        <Typography variant="h6">
                            🏥 Multi-Slice DICOM Viewer
                        </Typography>
                        <Stack direction="row" spacing={1}>
                            <Chip label={study.patient_id} size="small" />
                            <Chip label={study.original_filename || study.study_uid} size="small" variant="outlined" />
                            <Chip label={`${totalSlices} slices`} size="small" color="success" />
                            {totalSlices > 1 && (
                                <Chip label="Multi-slice Series" size="small" color="warning" />
                            )}
                            {loadedImages.length > 0 && (
                                <Chip label="Enhanced Navigation" size="small" color="info" />
                            )}
                        </Stack>
                    </Grid>
                </Grid>
            </Paper>
            
            {/* Controls */}
            <Paper sx={{ p: 1, bgcolor: '#1a1a1a' }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    {/* Zoom Controls */}
                    <Tooltip title="Zoom In">
                        <IconButton onClick={handleZoomIn} size="small" sx={{ color: '#00ff00' }}>
                            <ZoomIn />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Zoom Out">
                        <IconButton onClick={handleZoomOut} size="small" sx={{ color: '#00ff00' }}>
                            <ZoomOut />
                        </IconButton>
                    </Tooltip>
                    
                    {/* Rotation Controls */}
                    <Tooltip title="Rotate Left">
                        <IconButton onClick={handleRotateLeft} size="small" sx={{ color: '#00ff00' }}>
                            <RotateLeft />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Rotate Right">
                        <IconButton onClick={handleRotateRight} size="small" sx={{ color: '#00ff00' }}>
                            <RotateRight />
                        </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Reset">
                        <IconButton onClick={handleReset} size="small" sx={{ color: '#00ff00' }}>
                            <RestartAlt />
                        </IconButton>
                    </Tooltip>
                    
                    {/* Window/Level Controls */}
                    <Tooltip title="Auto Window/Level">
                        <IconButton 
                            onClick={() => {
                                if (canvasRef.current && loadedImages.length > 0) {
                                    try {
                                        const image = loadedImages[currentSlice];
                                        const viewport = cornerstone.getViewport(canvasRef.current);
                                        if (viewport && image) {
                                            const pixelData = image.getPixelData();
                                            if (pixelData) {
                                                let min = pixelData[0];
                                                let max = pixelData[0];
                                                
                                                // Sample pixels for performance
                                                const sampleSize = Math.min(pixelData.length, 10000);
                                                const step = Math.floor(pixelData.length / sampleSize);
                                                
                                                for (let i = 0; i < pixelData.length; i += step) {
                                                    const value = pixelData[i];
                                                    if (value < min) min = value;
                                                    if (value > max) max = value;
                                                }
                                                
                                                viewport.voi.windowWidth = max - min;
                                                viewport.voi.windowCenter = min + ((max - min) / 2);
                                                cornerstone.setViewport(canvasRef.current, viewport);
                                                
                                                console.log(`🎯 Manual auto-windowing: WW=${viewport.voi.windowWidth}, WC=${viewport.voi.windowCenter}`);
                                            }
                                        }
                                    } catch (e) {
                                        console.error('Error applying auto window/level:', e);
                                    }
                                }
                            }}
                            size="small" 
                            sx={{ color: '#00ff00' }}
                        >
                            <Typography variant="caption" sx={{ fontSize: '10px' }}>W/L</Typography>
                        </IconButton>
                    </Tooltip>
                    
                    {/* Refresh Display Button */}
                    <Tooltip title="Refresh Display">
                        <IconButton 
                            onClick={() => {
                                if (canvasRef.current && loadedImages.length > 0) {
                                    try {
                                        const image = loadedImages[0];
                                        
                                        // Force re-display with aggressive windowing
                                        cornerstone.displayImage(canvasRef.current, image);
                                        
                                        const viewport = cornerstone.getViewport(canvasRef.current);
                                        if (viewport) {
                                            // Apply aggressive windowing
                                            viewport.voi.windowWidth = 255;
                                            viewport.voi.windowCenter = 128;
                                            viewport.scale = 1.0;
                                            viewport.translation = { x: 0, y: 0 };
                                            viewport.rotation = 0;
                                            
                                            cornerstone.setViewport(canvasRef.current, viewport);
                                            // Force redraw
                                            cornerstone.displayImage(canvasRef.current, image);
                                            
                                            console.log('🔄 Display refreshed with default windowing');
                                        }
                                    } catch (e) {
                                        console.error('Error refreshing display:', e);
                                    }
                                }
                            }}
                            size="small" 
                            sx={{ color: '#00ff00' }}
                        >
                            <Typography variant="caption" sx={{ fontSize: '8px' }}>REF</Typography>
                        </IconButton>
                    </Tooltip>
                    
                    {/* Debug Display Button */}
                    <Tooltip title="Debug Display">
                        <IconButton 
                            onClick={() => {
                                if (canvasRef.current) {
                                    try {
                                        const viewport = cornerstone.getViewport(canvasRef.current);
                                        const enabledElement = cornerstone.getEnabledElement(canvasRef.current);
                                        
                                        console.group('🔍 DICOM Display Debug Info');
                                        console.log('Viewport:', viewport);
                                        console.log('Enabled Element:', enabledElement);
                                        console.log('Loaded Images:', loadedImages.length);
                                        console.log('Current Slice:', currentSlice);
                                        console.log('Image Loaded State:', imageLoaded);
                                        console.log('Canvas Dimensions:', canvasRef.current.width, 'x', canvasRef.current.height);
                                        
                                        if (loadedImages[0]) {
                                            const image = loadedImages[0];
                                            console.log('Current Image:', {
                                                width: image.width,
                                                height: image.height,
                                                minPixelValue: image.minPixelValue,
                                                maxPixelValue: image.maxPixelValue,
                                                slope: image.slope,
                                                intercept: image.intercept
                                            });
                                            
                                            // Try to get pixel data info
                                            try {
                                                const pixelData = image.getPixelData();
                                                console.log('Pixel Data:', {
                                                    length: pixelData.length,
                                                    type: pixelData.constructor.name,
                                                    first10: Array.from(pixelData.slice(0, 10))
                                                });
                                            } catch (e) {
                                                console.log('Could not access pixel data:', e);
                                            }
                                        }
                                        console.groupEnd();
                                    } catch (e) {
                                        console.error('Debug info error:', e);
                                    }
                                }
                            }}
                            size="small" 
                            sx={{ color: '#00ff00' }}
                        >
                            <Typography variant="caption" sx={{ fontSize: '8px' }}>DBG</Typography>
                        </IconButton>
                    </Tooltip>
                    
                    {/* Slice Navigation (Updated) */}
                    {totalSlices > 1 && (
                        <>
                            <Tooltip title="Previous Slice">
                                <span>
                                    <IconButton 
                                        onClick={() => setCurrentSlice(prev => Math.max(0, prev - 1))} 
                                        disabled={currentSlice === 0}
                                        size="small" 
                                        sx={{ color: '#00ff00' }}
                                    >
                                        <SkipPrevious />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            
                            <Tooltip title={isPlaying ? "Pause" : "Play"}>
                                <IconButton 
                                    onClick={() => {
                                        setIsPlaying(!isPlaying);
                                        setAutoScroll(!isPlaying);
                                    }} 
                                    size="small" 
                                    sx={{ color: '#00ff00' }}
                                >
                                    {isPlaying ? <Pause /> : <PlayArrow />}
                                </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="Next Slice">
                                <span>
                                    <IconButton 
                                        onClick={() => setCurrentSlice(prev => Math.min(totalSlices - 1, prev + 1))} 
                                        disabled={currentSlice === totalSlices - 1}
                                        size="small" 
                                        sx={{ color: '#00ff00' }}
                                    >
                                        <SkipNext />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '120px' }}>
                                <Typography variant="caption" sx={{ color: '#00ff00', fontSize: '0.75rem', mb: 0.5 }}>
                                    Slice {currentSlice + 1}/{totalSlices}
                                </Typography>
                                <Slider
                                    value={currentSlice}
                                    min={0}
                                    max={totalSlices - 1}
                                    step={1}
                                    onChange={(_, value) => setCurrentSlice(value as number)}
                                    sx={{
                                        width: '100px',
                                        height: 4,
                                        color: '#00ff00',
                                        '& .MuiSlider-thumb': {
                                            width: 12,
                                            height: 12,
                                            backgroundColor: '#00ff00',
                                        },
                                        '& .MuiSlider-track': {
                                            backgroundColor: '#00ff00',
                                        },
                                        '& .MuiSlider-rail': {
                                            backgroundColor: 'rgba(0, 255, 0, 0.3)',
                                        }
                                    }}
                                />
                            </Box>
                            
                            {/* Play Speed */}
                            <Tooltip title="Play Speed">
                                <IconButton size="small" sx={{ color: '#00ff00' }}>
                                    <Speed />
                                </IconButton>
                            </Tooltip>
                            <Slider
                                value={playSpeed}
                                min={1}
                                max={10}
                                onChange={(_, value) => setPlaySpeed(value as number)}
                                sx={{ width: 80, color: '#00ff00' }}
                                size="small"
                            />
                            <Typography variant="caption" sx={{ color: '#00ff00', ml: 1 }}>
                                {playSpeed} fps
                            </Typography>
                        </>
                    )}
                </Stack>
            </Paper>
            
            {/* Canvas */}
            <Box 
                ref={containerRef}
                sx={{ 
                    flex: 1, 
                    position: 'relative',
                    overflow: 'hidden',
                    bgcolor: '#000'
                }}
            >
                <canvas
                    ref={canvasRef}
                    style={{
                        width: '100%',
                        height: '100%',
                        cursor: 'crosshair'
                    }}
                />
                
                {!imageLoaded && !loading && !error && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                            color: '#00ff00'
                        }}
                    >
                        <Typography variant="h6">
                            No DICOM Image Loaded
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            Click "Retry Loading" to attempt loading the DICOM file
                        </Typography>
                    </Box>
                )}
                
                {/* Fallback image display when cornerstone fails but image loads */}
                {currentImageRef.current && imageLoaded && !loadedImages.length && (
                    <img
                        src={currentImageRef.current.src}
                        alt="DICOM Fallback"
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            maxWidth: '90%',
                            maxHeight: '90%',
                            objectFit: 'contain',
                            border: '2px solid #00ff00',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(0, 0, 0, 0.8)'
                        }}
                    />
                )}
                
                {/* Debug overlay when image is loaded but not visible */}
                {loadedImages.length > 0 && !currentImageRef.current && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            color: '#00ff00',
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            padding: '8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontFamily: 'monospace'
                        }}
                    >
                        <Typography variant="caption" sx={{ display: 'block' }}>
                            DICOM Loaded: {loadedImages.length} images
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block' }}>
                            Frame: {currentSlice + 1}/{totalSlices}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block' }}>
                            Status: Cornerstone rendering
                        </Typography>
                    </Box>
                )}
                
                {/* No image loaded state */}
                {!currentImageRef.current && !imageLoaded && !loading && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: '#00ff00',
                            textAlign: 'center',
                            p: 3,
                            border: '1px dashed #00ff00',
                            borderRadius: 2
                        }}
                    >
                        <Typography variant="h6" sx={{ mb: 2 }}>No DICOM image loaded</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                            Study: {study.study_uid || 'Unknown'}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                            Patient: {study.patient_id || 'Unknown'}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            File: {study.original_filename || 'Unknown'}
                        </Typography>
                        <Button 
                            variant="outlined" 
                            size="small" 
                            onClick={() => loadDicomImages()}
                            sx={{ color: '#00ff00', borderColor: '#00ff00' }}
                        >
                            Try Loading Again
                        </Button>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default MultiFrameDicomViewer;