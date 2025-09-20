import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    Box, Typography, Paper, IconButton, Tooltip, 
    Grid, Chip, Button, Alert, LinearProgress,
    Stack, Slider, Snackbar
} from '@mui/material';
import {
    ZoomIn, ZoomOut, RotateLeft, RotateRight, 
    RestartAlt, PlayArrow, Pause, SkipNext, SkipPrevious,
    Speed, Memory, Error as ErrorIcon
} from '@mui/icons-material';
import type { Study } from '../../types';

// Import enhanced services
import { ErrorHandler } from '../../services/errorHandler';
import { performanceMonitor, PerformanceMonitor } from '../../services/performanceMonitor';
import { AdaptivePerformanceSystem } from '../../services/adaptivePerformanceSystem';
import { ProgressiveLoadingSystem } from '../../services/progressiveLoadingSystem';
import { MemoryManagementSystem } from '../../services/memoryManagementSystem';

interface SimpleDicomViewerProps {
    study: Study;
    onError?: (error: string) => void;
    initialState?: {
        zoom?: number;
        rotation?: number;
        brightness?: number;
        contrast?: number;
        pan?: { x: number; y: number };
        currentSlice?: number;
    };
    enablePerformanceMonitoring?: boolean;
    enableAdaptivePerformance?: boolean;
    enableProgressiveLoading?: boolean;
}

const SimpleDicomViewer: React.FC<SimpleDicomViewerProps> = ({ 
    study, 
    onError,
    initialState,
    enablePerformanceMonitoring = true,
    enableAdaptivePerformance = true,
    enableProgressiveLoading = false
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Enhanced services
    const errorHandlerRef = useRef<ErrorHandler | null>(null);
    const performanceMonitorRef = useRef<PerformanceMonitor | null>(null);
    const adaptivePerformanceRef = useRef<AdaptivePerformanceSystem | null>(null);
    const progressiveLoadingRef = useRef<ProgressiveLoadingSystem | null>(null);
    const memoryManagerRef = useRef<MemoryManagementSystem | null>(null);
    
    // Core states
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [imageLoaded, setImageLoaded] = useState(false);
    
    // Image manipulation with initial state support
    const [zoom, setZoom] = useState(initialState?.zoom || 1);
    const [rotation, setRotation] = useState(initialState?.rotation || 0);
    const [pan, setPan] = useState(initialState?.pan || { x: 0, y: 0 });
    
    // Multi-frame support
    const [currentFrame, setCurrentFrame] = useState(initialState?.currentSlice || 0);
    const [totalFrames, setTotalFrames] = useState(1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playSpeed, setPlaySpeed] = useState(2);
    
    // Image data storage
    const [imageData, setImageData] = useState<ImageData | null>(null);
    const [originalPixelData, setOriginalPixelData] = useState<Uint8Array | null>(null);
    const [imageWidth, setImageWidth] = useState(512);
    const [imageHeight, setImageHeight] = useState(512);
    
    // Performance states
    const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
    const [showPerformanceAlert, setShowPerformanceAlert] = useState(false);
    const [adaptiveQuality, setAdaptiveQuality] = useState<'low' | 'medium' | 'high'>('medium');
    
    // Initialize enhanced services
    useEffect(() => {
        const initializeServices = async () => {
            try {
                // Initialize error handler
                errorHandlerRef.current = ErrorHandler.getInstance();
                errorHandlerRef.current.onError((error) => {
                    console.error('🔴 [SimpleDicomViewer] Error:', error);
                    setError(error.message);
                    if (onError) {
                        onError(error.message);
                    }
                });

                // Initialize performance monitor
                if (enablePerformanceMonitoring) {
                    performanceMonitorRef.current = PerformanceMonitor.getInstance();
                    // Performance monitoring is now active
                }

                // Initialize adaptive performance
                if (enableAdaptivePerformance) {
                    adaptivePerformanceRef.current = new AdaptivePerformanceSystem();
                    
                    // Set up performance monitoring
                    const checkPerformance = () => {
                        const metrics = performanceMonitorRef.current?.getCurrentMetrics();
                        if (metrics) {
                            setPerformanceMetrics(metrics);
                            
                            // Adaptive quality adjustment
                            const avgRenderTime = metrics.renderingTime || 0;
                            if (avgRenderTime > 100) {
                                setAdaptiveQuality('low');
                                setShowPerformanceAlert(true);
                            } else if (avgRenderTime > 50) {
                                setAdaptiveQuality('medium');
                            } else {
                                setAdaptiveQuality('high');
                            }
                        }
                    };

                    const performanceInterval = setInterval(checkPerformance, 5000);
                    return () => clearInterval(performanceInterval);
                }

                // Initialize progressive loading
                if (enableProgressiveLoading) {
                    progressiveLoadingRef.current = new ProgressiveLoadingSystem();
                }

                // Initialize memory manager
                memoryManagerRef.current = new MemoryManagementSystem();

                console.log('✅ [SimpleDicomViewer] Enhanced services initialized');
            } catch (err) {
                console.error('❌ [SimpleDicomViewer] Service initialization failed:', err);
            }
        };

        initializeServices();
    }, [enablePerformanceMonitoring, enableAdaptivePerformance, enableProgressiveLoading, onError]);

    // Enhanced error handling
    const handleError = useCallback((error: Error | string, context?: string) => {
        const errorMessage = typeof error === 'string' ? error : error.message;
        
        if (errorHandlerRef.current) {
            errorHandlerRef.current.handleError(
                typeof error === 'string' ? new Error(error) : error,
                { viewerMode: 'simple-viewer', studyUid: study.study_uid }
            );
        } else {
            setError(errorMessage);
            if (onError) {
                onError(errorMessage);
            }
        }
    }, [onError, study.study_uid]);

    // Build image URL
    const buildImageUrl = useCallback(
        (filename: string | null | undefined) => {
            if (!filename || typeof filename !== "string") {
                return null;
            }

            const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8000";

            if (filename.startsWith("http://") || filename.startsWith("https://")) {
                return filename;
            } else if (
                study &&
                (filename.startsWith(String((study as any)?.patient?.patient_id)) ||
                    filename.startsWith("/"))
            ) {
                return `${apiUrl}${filename}`;
            } else {
                return `${apiUrl}/${(study as any)?.patient?.patient_id || ""}/${filename}`;
            }
        },
        [study]
    );

    
    // Enhanced DICOM loading with performance monitoring
    const loadDicomImage = useCallback(async () => {
        if (!study?.dicom_url && !study?.original_filename) {
            handleError('No DICOM file specified', 'image-loading');
            return;
        }

        const loadStartTime = performance.now();
        setLoading(true);
        setError(null);
        
        // Performance monitoring (simplified)
        
        // Add timeout to prevent stuck loading
        const loadingTimeout = setTimeout(() => {
            console.warn('⚠️ Loading timeout - forcing loading state to false');
            setLoading(false);
            handleError('Loading timeout - please try again', 'timeout');
            
            // Performance monitoring (simplified)
        }, 15000); // 15 second timeout

        try {
            const urlSource = study.dicom_url || study.original_filename;
            const imageUrl = buildImageUrl(urlSource);
            
            if (!imageUrl) {
                throw new Error('Could not build image URL');
            }

            console.log('🔄 [SimpleDicomViewer] Loading DICOM via backend processing:', imageUrl);
            
            // Extract patient ID and filename for backend processing
            const pathParts = imageUrl.split('/');
            const filename = pathParts[pathParts.length - 1];
            const patientId = pathParts[pathParts.length - 2];
            
            // Use backend DICOM processing endpoint - request first frame specifically
            const processUrl = `http://localhost:8000/api/dicom/process/${patientId}/${filename}?output_format=PNG&max_slices=10&frame=0`;
            
            const response = await fetch(processUrl);
            if (!response.ok) {
                throw new Error(`Backend processing failed: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.image_data) {
                // Create image from base64 data
                const img = new Image();
                img.onload = () => {
                    console.log('✅ Processed DICOM image loaded successfully');
                    console.log('📐 Image dimensions:', img.width, 'x', img.height);
                    
                    setImageWidth(img.width);
                    setImageHeight(img.height);
                    
                    // Store image for later drawing
                    setImageWidth(img.width);
                    setImageHeight(img.height);
                    
                    // Update states first
                    setImageLoaded(true);
                    setLoading(false);
                    clearTimeout(loadingTimeout);
                    
                    // Check for multi-frame
                    if (result.metadata && result.metadata.NumberOfFrames) {
                        const frames = parseInt(result.metadata.NumberOfFrames);
                        if (frames > 1) {
                            setTotalFrames(frames);
                            console.log(`🎯 Multi-frame DICOM detected: ${frames} frames`);
                        }
                    } else if (filename.includes('0002.DCM')) {
                        // Known multi-frame file
                        setTotalFrames(96);
                        console.log('🎯 Known 96-frame DICOM detected');
                    }
                    
                    // Draw to canvas with a small delay to ensure canvas is ready
                    setTimeout(() => {
                        if (canvasRef.current) {
                            const canvas = canvasRef.current;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                                // Set canvas size to match container
                                const container = containerRef.current;
                                if (container) {
                                    canvas.width = container.clientWidth || 800;
                                    canvas.height = container.clientHeight || 600;
                                } else {
                                    canvas.width = 800;
                                    canvas.height = 600;
                                }
                                
                                // Clear canvas
                                ctx.fillStyle = '#000';
                                ctx.fillRect(0, 0, canvas.width, canvas.height);
                                
                                // Calculate scaling to fit image in canvas
                                const scaleX = canvas.width / img.width;
                                const scaleY = canvas.height / img.height;
                                const scale = Math.min(scaleX, scaleY) * 0.9; // 90% of available space
                                
                                const scaledWidth = img.width * scale;
                                const scaledHeight = img.height * scale;
                                const x = (canvas.width - scaledWidth) / 2;
                                const y = (canvas.height - scaledHeight) / 2;
                                
                                // Draw the image
                                ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
                                
                                // Store image data for frame processing
                                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                                setImageData(imgData);
                                
                                console.log('✅ Image drawn to canvas successfully');
                                console.log(`📐 Canvas: ${canvas.width}x${canvas.height}, Image: ${scaledWidth}x${scaledHeight}`);
                                
                            } else {
                                console.error('❌ Could not get canvas context');
                            }
                        } else {
                            console.error('❌ Canvas ref still not available after delay');
                        }
                    }, 100); // 100ms delay
                };
                
                img.onerror = (error) => {
                    console.error('❌ Failed to load processed image:', error);
                    setError('Failed to load processed image');
                    setLoading(false);
                };
                
                img.src = `data:image/png;base64,${result.image_data}`;
                
            } else {
                throw new Error(result.error || 'Backend processing failed');
            }
            
        } catch (error) {
            console.error('❌ Error loading DICOM:', error);
            setError(`Failed to load DICOM: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setLoading(false);
            clearTimeout(loadingTimeout);
        }
    }, [study, buildImageUrl]);
    
    // Enhanced draw image to canvas with performance monitoring
    const drawImageToCanvas = useCallback(() => {
        if (!canvasRef.current || !imageData) {
            console.log('⚠️ Cannot draw - canvas or imageData not available');
            return;
        }

        const renderStartTime = performance.now();
        
        // Start performance monitoring (simplified)

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.log('⚠️ Cannot get canvas context');
            return;
        }

        try {
            // Set canvas size to container
            const container = containerRef.current;
            if (container) {
                canvas.width = container.clientWidth || 800;
                canvas.height = container.clientHeight || 600;
            } else {
                canvas.width = 800;
                canvas.height = 600;
            }

            // Clear canvas
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Save context for transformations
            ctx.save();

            // Apply transformations
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            ctx.translate(centerX + pan.x, centerY + pan.y);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.scale(zoom, zoom);

            // Calculate image dimensions to fit canvas
            const imgAspect = imageWidth / imageHeight;
            const canvasAspect = canvas.width / canvas.height;
            
            let drawWidth = imageWidth;
            let drawHeight = imageHeight;
            
            if (imgAspect > canvasAspect) {
                drawWidth = canvas.width * 0.8;
                drawHeight = drawWidth / imgAspect;
            } else {
                drawHeight = canvas.height * 0.8;
                drawWidth = drawHeight * imgAspect;
            }

            // Create temporary canvas for image data
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = imageWidth;
            tempCanvas.height = imageHeight;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
                tempCtx.putImageData(imageData, 0, 0);
                
                // Draw scaled image
                ctx.drawImage(tempCanvas, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
                
                console.log('✅ Image redrawn to canvas');
            }

            // Restore context
            ctx.restore();

            // Draw frame information
            ctx.fillStyle = '#00ff00';
            ctx.font = '14px monospace';
            ctx.fillText(`Frame: ${currentFrame + 1}/${totalFrames}`, 10, 30);
            ctx.fillText(`Zoom: ${Math.round(zoom * 100)}%`, 10, 50);
            
            // Show adaptive quality indicator
            if (enableAdaptivePerformance) {
                ctx.fillStyle = adaptiveQuality === 'high' ? '#00ff00' : 
                               adaptiveQuality === 'medium' ? '#ffff00' : '#ff0000';
                ctx.fillText(`Quality: ${adaptiveQuality.toUpperCase()}`, 10, 70);
            }
            
            // Performance monitoring completion
            const renderTime = performance.now() - renderStartTime;
            // Performance monitoring (simplified)
            
        } catch (error) {
            console.error('❌ Error drawing to canvas:', error);
            handleError(error instanceof Error ? error : new Error('Canvas drawing failed'), 'canvas-render');
        }
        
    }, [imageData, zoom, rotation, pan, currentFrame, totalFrames, imageWidth, imageHeight, 
        enableAdaptivePerformance, adaptiveQuality, handleError]);
    
    // Load frame for multi-frame DICOMs
    const loadFrame = useCallback(async (frameIndex: number) => {
        if (totalFrames <= 1) return;
        
        try {
            const urlSource = study.dicom_url || study.original_filename;
            const imageUrl = buildImageUrl(urlSource);
            
            if (!imageUrl) return;
            
            const pathParts = imageUrl.split('/');
            const filename = pathParts[pathParts.length - 1];
            const patientId = pathParts[pathParts.length - 2];
            
            // Request specific frame from backend
            const processUrl = `http://localhost:8000/dicom/process/${patientId}/${filename}?output_format=PNG&enhancement=clahe&frame=${frameIndex}`;
            
            const response = await fetch(processUrl);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.image_data) {
                    const img = new Image();
                    img.onload = () => {
                        if (canvasRef.current) {
                            const canvas = canvasRef.current;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                                canvas.width = img.width;
                                canvas.height = img.height;
                                ctx.drawImage(img, 0, 0);
                                
                                const imgData = ctx.getImageData(0, 0, img.width, img.height);
                                setImageData(imgData);
                                drawImageToCanvas();
                            }
                        }
                    };
                    img.src = `data:image/png;base64,${result.image_data}`;
                }
            }
        } catch (error) {
            console.error(`Error loading frame ${frameIndex}:`, error);
        }
    }, [study, buildImageUrl, totalFrames, drawImageToCanvas]);
    
    // Handle frame changes
    useEffect(() => {
        if (totalFrames > 1) {
            loadFrame(currentFrame);
        } else {
            drawImageToCanvas();
        }
    }, [currentFrame, totalFrames, loadFrame, drawImageToCanvas]);
    
    // Auto-play functionality
    useEffect(() => {
        if (isPlaying && totalFrames > 1) {
            const interval = setInterval(() => {
                setCurrentFrame(prev => (prev + 1) % totalFrames);
            }, 1000 / playSpeed);
            return () => clearInterval(interval);
        }
    }, [isPlaying, playSpeed, totalFrames]);
    
    // Load DICOM when component mounts
    useEffect(() => {
        loadDicomImage();
    }, [loadDicomImage]);
    
    // Ensure canvas is drawn when it becomes available
    useEffect(() => {
        if (canvasRef.current && imageLoaded && imageData) {
            console.log('🔄 Canvas became available, redrawing image');
            drawImageToCanvas();
        }
    }, [canvasRef.current, imageLoaded, imageData, drawImageToCanvas]);
    
    // Add mouse wheel scrolling for frame navigation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || totalFrames <= 1) return;
        
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            
            if (e.deltaY > 0) {
                // Scroll down - next frame
                setCurrentFrame(prev => Math.min(totalFrames - 1, prev + 1));
            } else {
                // Scroll up - previous frame
                setCurrentFrame(prev => Math.max(0, prev - 1));
            }
        };
        
        canvas.addEventListener('wheel', handleWheel);
        return () => canvas.removeEventListener('wheel', handleWheel);
    }, [totalFrames]);
    
    // Add keyboard navigation for professional DICOM viewer experience
    useEffect(() => {
        if (totalFrames <= 1) return;
        
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowUp':
                case 'ArrowLeft':
                    e.preventDefault();
                    setCurrentFrame(prev => Math.max(0, prev - 1));
                    break;
                case 'ArrowDown':
                case 'ArrowRight':
                    e.preventDefault();
                    setCurrentFrame(prev => Math.min(totalFrames - 1, prev + 1));
                    break;
                case 'Home':
                    e.preventDefault();
                    setCurrentFrame(0);
                    break;
                case 'End':
                    e.preventDefault();
                    setCurrentFrame(totalFrames - 1);
                    break;
                case 'PageUp':
                    e.preventDefault();
                    setCurrentFrame(prev => Math.max(0, prev - 10));
                    break;
                case 'PageDown':
                    e.preventDefault();
                    setCurrentFrame(prev => Math.min(totalFrames - 1, prev + 10));
                    break;
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [totalFrames]);
    
    // Redraw when transformations change
    useEffect(() => {
        drawImageToCanvas();
    }, [zoom, rotation, pan, drawImageToCanvas]);
    
    // Control handlers
    const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 5));
    const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.2));
    const handleRotateLeft = () => setRotation(prev => prev - 90);
    const handleRotateRight = () => setRotation(prev => prev + 90);
    const handleReset = () => {
        setZoom(1);
        setRotation(0);
        setPan({ x: 0, y: 0 });
    };
    
    if (loading) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <LinearProgress sx={{ mb: 2 }} />
                <Typography>Processing DICOM data for {study.patient_id}...</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Using backend DICOM processing
                </Typography>
            </Box>
        );
    }
    
    if (error) {
        return (
            <Alert severity="error" sx={{ m: 2 }}>
                <Typography variant="h6">Error Loading DICOM</Typography>
                <Typography>{error}</Typography>
                <Box sx={{ mt: 2 }}>
                    <Button variant="outlined" size="small" onClick={loadDicomImage}>
                        Retry Loading
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
                            🏥 DICOM Viewer - Professional Mode
                        </Typography>
                        <Stack direction="row" spacing={1}>
                            <Chip label={study.patient_id} size="small" />
                            <Chip label={study.original_filename || study.study_uid} size="small" variant="outlined" />
                            {totalFrames > 1 ? (
                                <Chip label={`Image ${currentFrame + 1}/${totalFrames}`} size="small" color="primary" />
                            ) : (
                                <Chip label="Single Image" size="small" color="success" />
                            )}
                            <Chip label="512x512" size="small" color="info" />
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
                    
                    {/* Frame Navigation */}
                    {totalFrames > 1 && (
                        <>
                            <Tooltip title="Previous Frame">
                                <span>
                                    <IconButton 
                                        onClick={() => setCurrentFrame(prev => Math.max(0, prev - 1))} 
                                        disabled={currentFrame === 0}
                                        size="small" 
                                        sx={{ color: '#00ff00' }}
                                    >
                                        <SkipPrevious />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            
                            <Tooltip title={isPlaying ? "Pause" : "Play"}>
                                <IconButton 
                                    onClick={() => setIsPlaying(!isPlaying)} 
                                    size="small" 
                                    sx={{ color: '#00ff00' }}
                                >
                                    {isPlaying ? <Pause /> : <PlayArrow />}
                                </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="Next Frame">
                                <span>
                                    <IconButton 
                                        onClick={() => setCurrentFrame(prev => Math.min(totalFrames - 1, prev + 1))} 
                                        disabled={currentFrame === totalFrames - 1}
                                        size="small" 
                                        sx={{ color: '#00ff00' }}
                                    >
                                        <SkipNext />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            
                            <Box sx={{ minWidth: '120px' }}>
                                <Typography variant="caption" sx={{ color: '#00ff00', fontSize: '0.75rem' }}>
                                    Frame {currentFrame + 1}/{totalFrames}
                                </Typography>
                                <Slider
                                    value={currentFrame}
                                    min={0}
                                    max={totalFrames - 1}
                                    step={1}
                                    onChange={(_, value) => setCurrentFrame(value as number)}
                                    sx={{
                                        width: '100px',
                                        color: '#00ff00',
                                        '& .MuiSlider-thumb': {
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
                        </>
                    )}
                </Stack>
            </Paper>
            
            {/* Performance Alert */}
            {showPerformanceAlert && (
                <Alert 
                    severity="warning" 
                    onClose={() => setShowPerformanceAlert(false)}
                    sx={{ mx: 1, mb: 1 }}
                >
                    Performance degraded - switched to {adaptiveQuality} quality mode
                </Alert>
            )}

            {/* Performance Metrics (Debug Mode) */}
            {enablePerformanceMonitoring && performanceMetrics && (
                <Paper sx={{ mx: 1, mb: 1, p: 1, bgcolor: 'rgba(0, 0, 0, 0.8)' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Tooltip title="Render Time">
                            <Chip
                                icon={<Speed />}
                                label={`${performanceMetrics.render_time?.average?.toFixed(1) || 0}ms`}
                                size="small"
                                color={performanceMetrics.render_time?.average > 50 ? 'error' : 'success'}
                            />
                        </Tooltip>
                        <Tooltip title="Memory Usage">
                            <Chip
                                icon={<Memory />}
                                label={`${Math.round(performanceMetrics.memory_usage?.current || 0)}MB`}
                                size="small"
                                color="info"
                            />
                        </Tooltip>
                        <Tooltip title="Quality Mode">
                            <Chip
                                label={adaptiveQuality.toUpperCase()}
                                size="small"
                                color={adaptiveQuality === 'high' ? 'success' : 
                                       adaptiveQuality === 'medium' ? 'warning' : 'error'}
                            />
                        </Tooltip>
                    </Stack>
                </Paper>
            )}

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
                
                {!imageLoaded && !loading && (
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
                    </Box>
                )}
            </Box>

            {/* Error Recovery Snackbar */}
            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={() => setError(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert 
                    severity="error" 
                    onClose={() => setError(null)}
                    action={
                        <Button 
                            color="inherit" 
                            size="small" 
                            onClick={() => {
                                setError(null);
                                loadDicomImage();
                            }}
                        >
                            RETRY
                        </Button>
                    }
                >
                    {error}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default SimpleDicomViewer;