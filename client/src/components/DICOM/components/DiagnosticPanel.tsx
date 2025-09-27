/**
 * Diagnostic Panel - Comprehensive Study Analysis and Issue Detection
 * 
 * Advanced diagnostic capabilities including:
 * - Automated abnormality detection with AI analysis
 * - Study quality assessment and validation
 * - Measurement tools and quantitative analysis
 * - Comparative analysis and temporal tracking
 * - Clinical decision support and recommendations
 * - Integration with expert systems and knowledge bases
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo,
  useRef
} from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Alert,
  AlertTitle,
  LinearProgress,
  Divider,
  Badge,
  Card,
  CardContent,
  CardActions,
  Grid,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Tabs,
  Tab,
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Psychology as PsychologyIcon,
  Science as ScienceIcon,
  Timeline as TimelineIcon,
  Compare as CompareIcon,
  AutoFixHigh as AutoFixHighIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Share as ShareIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

// Services
import { abnormalityDetectionService } from '../../../services/abnormalityDetectionService';
import { aiAnalysisService } from '../../../services/aiAnalysisService';
import { studyQualityService } from '../../../services/studyQualityService';
import { measurementService } from '../../../services/measurementService';
import { comparativeAnalysisService } from '../../../services/comparativeAnalysisService';
import { clinicalDecisionSupportService } from '../../../services/clinicalDecisionSupportService';

// Types
export interface DiagnosticPanelProps {
  studyInstanceUID?: string;
  seriesInstanceUID?: string;
  imageIds?: string[];
  currentImageIndex?: number;
  patientData?: any;
  priorStudies?: any[];
  
  // Configuration
  enableAIAnalysis?: boolean;
  enableAbnormalityDetection?: boolean;
  enableQualityAssessment?: boolean;
  enableComparativeAnalysis?: boolean;
  enableClinicalSupport?: boolean;
  
  // Event handlers
  onFindingSelect?: (finding: any) => void;
  onMeasurementAdd?: (measurement: any) => void;
  onRecommendationAccept?: (recommendation: any) => void;
  onReportGenerate?: (report: any) => void;
  
  // Layout
  width?: number | string;
  height?: number | string;
  className?: string;
  sx?: any;
}

interface DiagnosticFinding {
  id: string;
  type: 'abnormality' | 'measurement' | 'quality' | 'recommendation';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  description: string;
  confidence: number;
  location?: {
    seriesInstanceUID: string;
    imageIndex: number;
    coordinates?: { x: number; y: number; z?: number };
    region?: any;
  };
  measurements?: any[];
  recommendations?: string[];
  metadata?: any;
  timestamp: Date;
}

interface QualityMetrics {
  overall: number;
  imageQuality: number;
  positioning: number;
  contrast: number;
  artifacts: number;
  completeness: number;
  issues: string[];
  recommendations: string[];
}

interface AIAnalysisResult {
  status: 'analyzing' | 'completed' | 'error';
  progress: number;
  findings: DiagnosticFinding[];
  confidence: number;
  processingTime: number;
  modelVersion: string;
  error?: string;
}

const DiagnosticPanel: React.FC<DiagnosticPanelProps> = ({
  studyInstanceUID,
  seriesInstanceUID,
  imageIds = [],
  currentImageIndex = 0,
  patientData,
  priorStudies = [],
  enableAIAnalysis = true,
  enableAbnormalityDetection = true,
  enableQualityAssessment = true,
  enableComparativeAnalysis = true,
  enableClinicalSupport = true,
  onFindingSelect,
  onMeasurementAdd,
  onRecommendationAccept,
  onReportGenerate,
  width = '100%',
  height = '100%',
  className,
  sx
}) => {
  const theme = useTheme();
  const analysisRef = useRef<any>(null);
  
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [findings, setFindings] = useState<DiagnosticFinding[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [aiAnalysis, setAIAnalysis] = useState<AIAnalysisResult>({
    status: 'analyzing',
    progress: 0,
    findings: [],
    confidence: 0,
    processingTime: 0,
    modelVersion: '1.0'
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<DiagnosticFinding | null>(null);
  const [showOnlyHighPriority, setShowOnlyHighPriority] = useState(false);
  const [analysisSettings, setAnalysisSettings] = useState({
    sensitivity: 'medium',
    includeSubtle: true,
    enableQuantitative: true,
    enableComparative: true
  });

  // Filtered findings based on current settings
  const filteredFindings = useMemo(() => {
    let filtered = findings;
    
    if (showOnlyHighPriority) {
      filtered = filtered.filter(f => 
        f.severity === 'critical' || f.severity === 'high'
      );
    }
    
    return filtered.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }, [findings, showOnlyHighPriority]);

  // Severity statistics
  const severityStats = useMemo(() => {
    const stats = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => stats[f.severity]++);
    return stats;
  }, [findings]);

  // Start comprehensive analysis
  const startAnalysis = useCallback(async () => {
    if (!studyInstanceUID || isAnalyzing) return;

    setIsAnalyzing(true);
    setFindings([]);
    setAIAnalysis(prev => ({ ...prev, status: 'analyzing', progress: 0 }));

    try {
      const analysisPromises: Promise<any>[] = [];

      // 1. Quality Assessment
      if (enableQualityAssessment) {
        analysisPromises.push(
          studyQualityService.assessStudyQuality(studyInstanceUID)
            .then(quality => {
              setQualityMetrics(quality);
              setAIAnalysis(prev => ({ ...prev, progress: prev.progress + 20 }));
              
              // Add quality findings
              const qualityFindings: DiagnosticFinding[] = quality.issues.map((issue, index) => ({
                id: `quality_${index}`,
                type: 'quality',
                severity: quality.overall < 0.5 ? 'high' : quality.overall < 0.7 ? 'medium' : 'low',
                category: 'Image Quality',
                title: issue,
                description: `Quality issue detected: ${issue}`,
                confidence: quality.overall,
                timestamp: new Date()
              }));
              
              setFindings(prev => [...prev, ...qualityFindings]);
            })
        );
      }

      // 2. Abnormality Detection
      if (enableAbnormalityDetection) {
        analysisPromises.push(
          abnormalityDetectionService.detectAbnormalities(studyInstanceUID)
            .then(abnormalities => {
              setAIAnalysis(prev => ({ ...prev, progress: prev.progress + 30 }));
              
              const abnormalityFindings: DiagnosticFinding[] = abnormalities.map(abnormality => ({
                id: abnormality.id,
                type: 'abnormality',
                severity: abnormality.severity,
                category: abnormality.category,
                title: abnormality.name,
                description: abnormality.description,
                confidence: abnormality.confidence,
                location: abnormality.location,
                recommendations: abnormality.recommendations,
                metadata: abnormality.metadata,
                timestamp: new Date()
              }));
              
              setFindings(prev => [...prev, ...abnormalityFindings]);
            })
        );
      }

      // 3. AI Analysis
      if (enableAIAnalysis) {
        analysisPromises.push(
          aiAnalysisService.analyzeStudy(studyInstanceUID, {
            includeQuantitative: analysisSettings.enableQuantitative,
            sensitivity: analysisSettings.sensitivity,
            includeSubtle: analysisSettings.includeSubtle
          }).then(analysis => {
            setAIAnalysis(prev => ({ 
              ...prev, 
              progress: prev.progress + 30,
              confidence: analysis.confidence,
              modelVersion: analysis.modelVersion,
              processingTime: analysis.processingTime
            }));
            
            const aiFindings: DiagnosticFinding[] = analysis.findings.map(finding => ({
              id: finding.id,
              type: 'abnormality',
              severity: finding.severity,
              category: finding.category,
              title: finding.title,
              description: finding.description,
              confidence: finding.confidence,
              location: finding.location,
              measurements: finding.measurements,
              recommendations: finding.recommendations,
              timestamp: new Date()
            }));
            
            setFindings(prev => [...prev, ...aiFindings]);
          })
        );
      }

      // 4. Comparative Analysis
      if (enableComparativeAnalysis && priorStudies.length > 0) {
        analysisPromises.push(
          comparativeAnalysisService.compareWithPriorStudies(studyInstanceUID, priorStudies)
            .then(comparison => {
              setAIAnalysis(prev => ({ ...prev, progress: prev.progress + 20 }));
              
              const comparisonFindings: DiagnosticFinding[] = comparison.changes.map(change => ({
                id: change.id,
                type: 'abnormality',
                severity: change.significance === 'significant' ? 'high' : 'medium',
                category: 'Temporal Changes',
                title: change.description,
                description: `Change detected compared to prior study: ${change.details}`,
                confidence: change.confidence,
                location: change.location,
                metadata: { 
                  priorStudyDate: change.priorStudyDate,
                  changeType: change.type
                },
                timestamp: new Date()
              }));
              
              setFindings(prev => [...prev, ...comparisonFindings]);
            })
        );
      }

      // Wait for all analyses to complete
      await Promise.all(analysisPromises);

      setAIAnalysis(prev => ({ 
        ...prev, 
        status: 'completed', 
        progress: 100 
      }));

    } catch (error) {
      console.error('Analysis failed:', error);
      setAIAnalysis(prev => ({ 
        ...prev, 
        status: 'error', 
        error: error.message 
      }));
    } finally {
      setIsAnalyzing(false);
    }
  }, [
    studyInstanceUID,
    isAnalyzing,
    enableQualityAssessment,
    enableAbnormalityDetection,
    enableAIAnalysis,
    enableComparativeAnalysis,
    priorStudies,
    analysisSettings
  ]);

  // Auto-start analysis when study changes
  useEffect(() => {
    if (studyInstanceUID) {
      startAnalysis();
    }
  }, [studyInstanceUID, startAnalysis]);

  // Handle finding selection
  const handleFindingSelect = useCallback((finding: DiagnosticFinding) => {
    setSelectedFinding(finding);
    if (onFindingSelect) {
      onFindingSelect(finding);
    }
  }, [onFindingSelect]);

  // Generate severity icon
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon color="error" />;
      case 'high':
        return <WarningIcon color="warning" />;
      case 'medium':
        return <InfoIcon color="info" />;
      case 'low':
        return <CheckCircleIcon color="success" />;
      default:
        return <InfoIcon />;
    }
  };

  // Generate severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return theme.palette.error.main;
      case 'high':
        return theme.palette.warning.main;
      case 'medium':
        return theme.palette.info.main;
      case 'low':
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };

  // Tab content components
  const FindingsTab = () => (
    <Box>
      {/* Controls */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={showOnlyHighPriority}
              onChange={(e) => setShowOnlyHighPriority(e.target.checked)}
            />
          }
          label="High Priority Only"
        />
        <Button
          startIcon={<RefreshIcon />}
          onClick={startAnalysis}
          disabled={isAnalyzing}
          size="small"
        >
          Re-analyze
        </Button>
      </Box>

      {/* Statistics */}
      <Grid container spacing={1} sx={{ mb: 2 }}>
        {Object.entries(severityStats).map(([severity, count]) => (
          <Grid item key={severity}>
            <Chip
              icon={getSeverityIcon(severity)}
              label={`${severity}: ${count}`}
              size="small"
              variant={count > 0 ? 'filled' : 'outlined'}
              sx={{ 
                bgcolor: count > 0 ? getSeverityColor(severity) : 'transparent',
                color: count > 0 ? 'white' : 'inherit'
              }}
            />
          </Grid>
        ))}
      </Grid>

      {/* Findings List */}
      <List dense>
        {filteredFindings.map((finding) => (
          <ListItem
            key={finding.id}
            button
            onClick={() => handleFindingSelect(finding)}
            selected={selectedFinding?.id === finding.id}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              mb: 1,
              bgcolor: selectedFinding?.id === finding.id ? 'action.selected' : 'background.paper'
            }}
          >
            <ListItemIcon>
              {getSeverityIcon(finding.severity)}
            </ListItemIcon>
            <ListItemText
              primary={finding.title}
              secondary={
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {finding.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <Chip
                      label={finding.category}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`${(finding.confidence * 100).toFixed(0)}%`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                </Box>
              }
            />
            <ListItemSecondaryAction>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  // Navigate to finding location
                  if (finding.location && onFindingSelect) {
                    onFindingSelect(finding);
                  }
                }}
              >
                <VisibilityIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      {filteredFindings.length === 0 && !isAnalyzing && (
        <Alert severity="info">
          <AlertTitle>No Findings</AlertTitle>
          {findings.length === 0 
            ? 'No diagnostic findings detected in this study.'
            : 'No findings match the current filter criteria.'
          }
        </Alert>
      )}
    </Box>
  );

  const QualityTab = () => (
    <Box>
      {qualityMetrics ? (
        <>
          {/* Overall Quality Score */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Overall Quality Score
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CircularProgress
                  variant="determinate"
                  value={qualityMetrics.overall * 100}
                  size={60}
                  thickness={6}
                  sx={{
                    color: qualityMetrics.overall > 0.8 ? 'success.main' :
                           qualityMetrics.overall > 0.6 ? 'warning.main' : 'error.main'
                  }}
                />
                <Typography variant="h4">
                  {(qualityMetrics.overall * 100).toFixed(0)}%
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Quality Metrics */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {Object.entries(qualityMetrics).map(([key, value]) => {
              if (key === 'overall' || key === 'issues' || key === 'recommendations') return null;
              return (
                <Grid item xs={6} key={key}>
                  <Card>
                    <CardContent sx={{ pb: 1 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {key?.charAt(0)?.toUpperCase() + key?.slice(1) || 'Unknown'}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={value * 100}
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="body2">
                        {(value * 100).toFixed(0)}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Issues */}
          {qualityMetrics.issues.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Quality Issues ({qualityMetrics.issues.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {qualityMetrics.issues.map((issue, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <WarningIcon color="warning" />
                      </ListItemIcon>
                      <ListItemText primary={issue} />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Recommendations */}
          {qualityMetrics.recommendations.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Recommendations ({qualityMetrics.recommendations.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {qualityMetrics.recommendations.map((rec, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <AutoFixHighIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={rec} />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}
        </>
      ) : (
        <Alert severity="info">
          Quality assessment is in progress...
        </Alert>
      )}
    </Box>
  );

  const AIAnalysisTab = () => (
    <Box>
      {/* Analysis Status */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            AI Analysis Status
          </Typography>
          <Box sx={{ mb: 2 }}>
            <LinearProgress
              variant="determinate"
              value={aiAnalysis.progress}
              sx={{ mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              {aiAnalysis.status === 'analyzing' ? 'Analyzing...' :
               aiAnalysis.status === 'completed' ? 'Analysis Complete' :
               aiAnalysis.status === 'error' ? 'Analysis Failed' : 'Ready'}
            </Typography>
          </Box>
          
          {aiAnalysis.status === 'completed' && (
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">
                  Confidence
                </Typography>
                <Typography variant="h6">
                  {(aiAnalysis.confidence * 100).toFixed(0)}%
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">
                  Processing Time
                </Typography>
                <Typography variant="h6">
                  {aiAnalysis.processingTime.toFixed(1)}s
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">
                  Model Version
                </Typography>
                <Typography variant="h6">
                  {aiAnalysis.modelVersion}
                </Typography>
              </Grid>
            </Grid>
          )}
          
          {aiAnalysis.status === 'error' && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {aiAnalysis.error}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Analysis Settings */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Analysis Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Sensitivity</InputLabel>
                <Select
                  value={analysisSettings.sensitivity}
                  onChange={(e) => setAnalysisSettings(prev => ({
                    ...prev,
                    sensitivity: e.target.value
                  }))}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={analysisSettings.includeSubtle}
                    onChange={(e) => setAnalysisSettings(prev => ({
                      ...prev,
                      includeSubtle: e.target.checked
                    }))}
                  />
                }
                label="Include Subtle Findings"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={analysisSettings.enableQuantitative}
                    onChange={(e) => setAnalysisSettings(prev => ({
                      ...prev,
                      enableQuantitative: e.target.checked
                    }))}
                  />
                }
                label="Enable Quantitative Analysis"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  return (
    <Paper
      className={className}
      sx={{
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        ...sx
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          Diagnostic Analysis
        </Typography>
        
        {/* Analysis Progress */}
        {isAnalyzing && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress />
            <Typography variant="caption" color="text.secondary">
              Analyzing study... {aiAnalysis.progress}%
            </Typography>
          </Box>
        )}
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            label={
              <Badge badgeContent={filteredFindings.length} color="primary">
                Findings
              </Badge>
            }
            icon={<AssessmentIcon />}
          />
          <Tab
            label="Quality"
            icon={<ScienceIcon />}
          />
          <Tab
            label="AI Analysis"
            icon={<PsychologyIcon />}
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {activeTab === 0 && <FindingsTab />}
        {activeTab === 1 && <QualityTab />}
        {activeTab === 2 && <AIAnalysisTab />}
      </Box>

      {/* Actions */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button
            startIcon={<SaveIcon />}
            size="small"
            onClick={() => {
              // Save analysis results
              const report = {
                studyInstanceUID,
                findings: filteredFindings,
                qualityMetrics,
                aiAnalysis,
                timestamp: new Date()
              };
              if (onReportGenerate) {
                onReportGenerate(report);
              }
            }}
          >
            Save Report
          </Button>
          <Button
            startIcon={<ShareIcon />}
            size="small"
            variant="outlined"
          >
            Share
          </Button>
          <Button
            startIcon={<PrintIcon />}
            size="small"
            variant="outlined"
          >
            Print
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default DiagnosticPanel;
export type { DiagnosticPanelProps, DiagnosticFinding, QualityMetrics, AIAnalysisResult };