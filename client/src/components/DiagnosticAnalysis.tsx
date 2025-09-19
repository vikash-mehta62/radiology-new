import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Alert,
  LinearProgress,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Badge
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';

interface AbnormalityFinding {
  id: string;
  type: 'critical' | 'significant' | 'minor' | 'incidental';
  description: string;
  location: string;
  confidence: number;
  severity_score: number;
  requires_urgent_review: boolean;
  suggested_followup: string;
  coordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface DiagnosticAnalysisData {
  analysis_id: string;
  overall_confidence: number;
  confidence_level: 'high' | 'moderate' | 'low' | 'uncertain';
  abnormalities: AbnormalityFinding[];
  normal_findings: string[];
  critical_alerts: string[];
  processing_time: number;
  model_version: string;
}

interface DiagnosticAnalysisProps {
  studyUid: string;
  analysisData?: DiagnosticAnalysisData;
  onAbnormalityClick?: (abnormality: AbnormalityFinding) => void;
}

const DiagnosticAnalysis: React.FC<DiagnosticAnalysisProps> = ({
  studyUid,
  analysisData,
  onAbnormalityClick
}) => {
  const [loading, setLoading] = useState(!analysisData);
  const [analysis, setAnalysis] = useState<DiagnosticAnalysisData | null>(analysisData || null);

  useEffect(() => {
    if (!analysisData) {
      fetchAnalysis();
    }
  }, [studyUid, analysisData]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/studies/${studyUid}/diagnostic-analysis`);
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data.diagnostic_analysis);
      }
    } catch (error) {
      console.error('Error fetching diagnostic analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high': return 'success';
      case 'moderate': return 'warning';
      case 'low': return 'error';
      default: return 'default';
    }
  };

  const getSeverityIcon = (type: string) => {
    switch (type) {
      case 'critical': return <ErrorIcon color="error" />;
      case 'significant': return <WarningIcon color="warning" />;
      case 'minor': return <InfoIcon color="info" />;
      default: return <InfoIcon />;
    }
  };

  const getSeverityColor = (type: string) => {
    switch (type) {
      case 'critical': return 'error';
      case 'significant': return 'warning';
      case 'minor': return 'info';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            AI Diagnostic Analysis
          </Typography>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Analyzing study with AI models...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            AI Diagnostic Analysis
          </Typography>
          <Alert severity="info">
            No diagnostic analysis available for this study.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            AI Diagnostic Analysis
          </Typography>
          <Chip
            label={`${analysis.confidence_level.toUpperCase()} CONFIDENCE`}
            color={getConfidenceColor(analysis.confidence_level) as any}
            size="small"
          />
        </Box>

        {/* Critical Alerts */}
        {analysis.critical_alerts.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Critical Findings Detected
            </Typography>
            {analysis.critical_alerts.map((alert, index) => (
              <Typography key={index} variant="body2">
                {alert}
              </Typography>
            ))}
          </Alert>
        )}

        {/* Overall Confidence */}
        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>
            Overall Confidence: {(analysis.overall_confidence * 100).toFixed(1)}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={analysis.overall_confidence * 100}
            color={getConfidenceColor(analysis.confidence_level) as any}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        <Grid container spacing={2}>
          {/* Abnormalities */}
          <Grid item xs={12} md={6}>
            <Accordion defaultExpanded={analysis.abnormalities.length > 0}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Badge badgeContent={analysis.abnormalities.length} color="error">
                  <Typography variant="subtitle1">
                    Detected Abnormalities
                  </Typography>
                </Badge>
              </AccordionSummary>
              <AccordionDetails>
                {analysis.abnormalities.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No abnormalities detected
                  </Typography>
                ) : (
                  <List dense>
                    {analysis.abnormalities.map((abnormality) => (
                      <ListItem
                        key={abnormality.id}
                        button
                        onClick={() => onAbnormalityClick?.(abnormality)}
                        sx={{
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1
                        }}
                      >
                        <ListItemIcon>
                          {getSeverityIcon(abnormality.type)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2">
                                {abnormality.description}
                              </Typography>
                              <Chip
                                label={abnormality.type.toUpperCase()}
                                size="small"
                                color={getSeverityColor(abnormality.type) as any}
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                Location: {abnormality.location}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Confidence: {(abnormality.confidence * 100).toFixed(1)}%
                              </Typography>
                              <Typography variant="caption" display="block">
                                Severity: {abnormality.severity_score}/10
                              </Typography>
                              {abnormality.requires_urgent_review && (
                                <Chip
                                  label="URGENT REVIEW"
                                  size="small"
                                  color="error"
                                  sx={{ mt: 0.5 }}
                                />
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Normal Findings */}
          <Grid item xs={12} md={6}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Badge badgeContent={analysis.normal_findings.length} color="success">
                  <Typography variant="subtitle1">
                    Normal Findings
                  </Typography>
                </Badge>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {analysis.normal_findings.map((finding, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2">
                            {finding}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>

        {/* Analysis Metadata */}
        <Box mt={2} pt={2} borderTop={1} borderColor="divider">
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Processing Time: {analysis.processing_time.toFixed(2)}s
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Model: {analysis.model_version}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

export default DiagnosticAnalysis;