/**
 * AI Enhancement Panel Component
 * Provides controls for AI-powered image enhancement and analysis
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  Slider,
  Button,
  ButtonGroup,
  Chip,
  LinearProgress,
  Alert,
  Tooltip,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  ExpandMore,
  AutoAwesome,
  Psychology,
  Healing,
  FilterVintage,
  BrightnessMedium,
  Tune,
  SmartToy,
  Analytics,
  Visibility,
  PlayArrow,
  Stop
} from '@mui/icons-material';

import { AIEnhancementModule, AIProcessingOptions, DetectionResult } from '../../services/aiEnhancementModule';
import { ImageEnhancementAlgorithms, ContrastEnhancementOptions } from '../../services/imageEnhancementAlgorithms';

export interface AIEnhancementPanelProps {
  imageData: ImageData | Float32Array | null;
  onEnhancementApplied: (enhancedData: ImageData | Float32Array) => void;
  onDetectionResults: (results: DetectionResult[]) => void;
  onError: (error: string) => void;
  aiModule: AIEnhancementModule;
  enabled: boolean;
}

interface EnhancementSettings {
  clahe: {
    enabled: boolean;
    clipLimit: number;
    tileSize: number;
  };
  denoising: {
    enabled: boolean;
    strength: number;
    method: 'gaussian' | 'bilateral' | 'non_local_means';
  };
  sharpening: {
    enabled: boolean;
    amount: number;
    radius: number;
  };
  contrast: {
    enabled: boolean;
    method: 'histogram_equalization' | 'clahe' | 'gamma_correction';
    gamma: number;
  };
}

export const AIEnhancementPanel: React.FC<AIEnhancementPanelProps> = ({
  imageData,
  onEnhancementApplied,
  onDetectionResults,
  onError,
  aiModule,
  enabled
}) => {
  const [processing, setProcessing] = useState(false);
  const [detectionRunning, setDetectionRunning] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [lastProcessingTime, setLastProcessingTime] = useState<number | null>(null);
  const [detectionResults, setDetectionResults] = useState<DetectionResult[]>([]);
  
  const [settings, setSettings] = useState<EnhancementSettings>({
    clahe: {
      enabled: false,
      clipLimit: 2.0,
      tileSize: 8
    },
    denoising: {
      enabled: false,
      strength: 0.5,
      method: 'bilateral'
    },
    sharpening: {
      enabled: false,
      amount: 1.0,
      radius: 1.0
    },
    contrast: {
      enabled: false,
      method: 'clahe',
      gamma: 1.0
    }
  });

  const [autoProcessing, setAutoProcessing] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);

  // Auto-process when settings change and auto-processing is enabled
  useEffect(() => {
    if (autoProcessing && imageData && enabled) {
      handleEnhanceImage();
    }
  }, [settings, autoProcessing, imageData, enabled]);

  const handleEnhanceImage = useCallback(async () => {
    if (!imageData || !enabled) return;

    setProcessing(true);
    setProcessingProgress(0);
    const startTime = performance.now();

    try {
      let enhancedData = imageData;

      // Apply CLAHE if enabled
      if (settings.clahe.enabled) {
        setProcessingProgress(25);
        enhancedData = ImageEnhancementAlgorithms.applyCLAHE(
          enhancedData,
          settings.clahe.clipLimit,
          settings.clahe.tileSize
        );
      }

      // Apply AI-based enhancements
      const hasAIEnhancements = settings.denoising.enabled || settings.sharpening.enabled || settings.contrast.enabled;
      
      if (hasAIEnhancements) {
        setProcessingProgress(50);
        
        const processingOptions: AIProcessingOptions = {
          modelId: 'contrast-enhancement',
          inputData: enhancedData,
          confidence: confidenceThreshold,
          batchSize: 1,
          useGPU: true,
          preprocessing: {
            normalize: true,
            resize: true,
            targetSize: { width: 512, height: 512 },
            augmentation: false
          },
          postprocessing: {
            smoothing: settings.denoising.enabled,
            thresholding: false
          }
        };

        const result = await aiModule.processImage(processingOptions);
        
        if (result.success) {
          enhancedData = result.processedData;
          setProcessingProgress(75);
        } else {
          throw new Error(result.error || 'AI processing failed');
        }
      }

      setProcessingProgress(100);
      const processingTime = performance.now() - startTime;
      setLastProcessingTime(processingTime);
      
      onEnhancementApplied(enhancedData);

    } catch (error) {
      console.error('Enhancement failed:', error);
      onError(error instanceof Error ? error.message : 'Enhancement failed');
    } finally {
      setProcessing(false);
      setProcessingProgress(0);
    }
  }, [imageData, settings, aiModule, confidenceThreshold, enabled, onEnhancementApplied, onError]);

  const handleDetectAbnormalities = useCallback(async () => {
    if (!imageData || !enabled) return;

    setDetectionRunning(true);
    
    try {
      const results = await aiModule.analyzeImage(imageData, 'abnormality-detection');
      
      const filteredDetections = results.detections.filter(
        detection => detection.confidence >= confidenceThreshold
      );
      
      setDetectionResults(filteredDetections);
      onDetectionResults(filteredDetections);

    } catch (error) {
      console.error('Detection failed:', error);
      onError(error instanceof Error ? error.message : 'Detection failed');
    } finally {
      setDetectionRunning(false);
    }
  }, [imageData, aiModule, confidenceThreshold, enabled, onDetectionResults, onError]);

  const handleSettingChange = useCallback((category: keyof EnhancementSettings, setting: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({
      clahe: { enabled: false, clipLimit: 2.0, tileSize: 8 },
      denoising: { enabled: false, strength: 0.5, method: 'bilateral' },
      sharpening: { enabled: false, amount: 1.0, radius: 1.0 },
      contrast: { enabled: false, method: 'clahe', gamma: 1.0 }
    });
  }, []);

  if (!enabled) {
    return (
      <Paper sx={{ p: 2, opacity: 0.6 }}>
        <Typography variant="h6" color="text.secondary">
          AI Enhancement Disabled
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Enable AI features to access enhancement tools
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" display="flex" alignItems="center" gap={1}>
          <SmartToy color="primary" />
          AI Enhancement
        </Typography>
        
        <Box display="flex" gap={1}>
          <FormControlLabel
            control={
              <Switch
                checked={autoProcessing}
                onChange={(e) => setAutoProcessing(e.target.checked)}
                size="small"
              />
            }
            label="Auto"
          />
          <Button
            variant="outlined"
            size="small"
            onClick={resetSettings}
            disabled={processing}
          >
            Reset
          </Button>
        </Box>
      </Box>

      {processing && (
        <Box mb={2}>
          <LinearProgress variant="determinate" value={processingProgress} />
          <Typography variant="caption" color="text.secondary">
            Processing... {Math.round(processingProgress)}%
          </Typography>
        </Box>
      )}

      {lastProcessingTime && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Enhancement completed in {Math.round(lastProcessingTime)}ms
        </Alert>
      )}

      {/* CLAHE Enhancement */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center" gap={1}>
            <BrightnessMedium />
            <Typography>CLAHE Enhancement</Typography>
            {settings.clahe.enabled && <Chip label="Active" size="small" color="primary" />}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.clahe.enabled}
                    onChange={(e) => handleSettingChange('clahe', 'enabled', e.target.checked)}
                  />
                }
                label="Enable CLAHE"
              />
            </Grid>
            <Grid item xs={6}>
              <Typography gutterBottom>Clip Limit</Typography>
              <Slider
                value={settings.clahe.clipLimit}
                onChange={(_, value) => handleSettingChange('clahe', 'clipLimit', value)}
                min={1}
                max={10}
                step={0.1}
                disabled={!settings.clahe.enabled}
                valueLabelDisplay="auto"
              />
            </Grid>
            <Grid item xs={6}>
              <Typography gutterBottom>Tile Size</Typography>
              <Slider
                value={settings.clahe.tileSize}
                onChange={(_, value) => handleSettingChange('clahe', 'tileSize', value)}
                min={4}
                max={32}
                step={2}
                disabled={!settings.clahe.enabled}
                valueLabelDisplay="auto"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* AI Denoising */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center" gap={1}>
            <Healing />
            <Typography>AI Denoising</Typography>
            {settings.denoising.enabled && <Chip label="Active" size="small" color="primary" />}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.denoising.enabled}
                    onChange={(e) => handleSettingChange('denoising', 'enabled', e.target.checked)}
                  />
                }
                label="Enable AI Denoising"
              />
            </Grid>
            <Grid item xs={6}>
              <Typography gutterBottom>Strength</Typography>
              <Slider
                value={settings.denoising.strength}
                onChange={(_, value) => handleSettingChange('denoising', 'strength', value)}
                min={0.1}
                max={2.0}
                step={0.1}
                disabled={!settings.denoising.enabled}
                valueLabelDisplay="auto"
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth disabled={!settings.denoising.enabled}>
                <InputLabel>Method</InputLabel>
                <Select
                  value={settings.denoising.method}
                  onChange={(e) => handleSettingChange('denoising', 'method', e.target.value)}
                >
                  <MenuItem value="gaussian">Gaussian</MenuItem>
                  <MenuItem value="bilateral">Bilateral</MenuItem>
                  <MenuItem value="non_local_means">Non-Local Means</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* AI Detection */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center" gap={1}>
            <Psychology />
            <Typography>Abnormality Detection</Typography>
            {detectionResults.length > 0 && (
              <Chip label={`${detectionResults.length} found`} size="small" color="warning" />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography gutterBottom>Confidence Threshold</Typography>
              <Slider
                value={confidenceThreshold}
                onChange={(_, value) => setConfidenceThreshold(value as number)}
                min={0.1}
                max={1.0}
                step={0.05}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
              />
            </Grid>
            <Grid item xs={12}>
              <ButtonGroup fullWidth>
                <Button
                  variant="contained"
                  startIcon={detectionRunning ? <Stop /> : <PlayArrow />}
                  onClick={handleDetectAbnormalities}
                  disabled={!imageData || detectionRunning}
                >
                  {detectionRunning ? 'Stop Detection' : 'Detect Abnormalities'}
                </Button>
              </ButtonGroup>
            </Grid>
            
            {detectionResults.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Detection Results:
                </Typography>
                {detectionResults.map((result, index) => (
                  <Card key={index} sx={{ mb: 1 }}>
                    <CardContent sx={{ py: 1 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">
                          {result.class} - {result.description}
                        </Typography>
                        <Chip
                          label={`${Math.round(result.confidence * 100)}%`}
                          size="small"
                          color={result.severity === 'critical' ? 'error' : 
                                 result.severity === 'high' ? 'warning' : 'info'}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Quick Actions */}
      <Box mt={2}>
        <Divider sx={{ mb: 2 }} />
        <ButtonGroup fullWidth variant="outlined">
          <Button
            startIcon={<AutoAwesome />}
            onClick={handleEnhanceImage}
            disabled={!imageData || processing}
          >
            Enhance
          </Button>
          <Button
            startIcon={<Analytics />}
            onClick={handleDetectAbnormalities}
            disabled={!imageData || detectionRunning}
          >
            Analyze
          </Button>
        </ButtonGroup>
      </Box>
    </Paper>
  );
};

export default AIEnhancementPanel;