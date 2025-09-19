import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  CheckCircle as ValidIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Lightbulb as SuggestionIcon,
  Security as ComplianceIcon,
  TrendingDown as RiskIcon,
} from '@mui/icons-material';

import { ValidationResult } from '../../types';

interface ValidationResultPanelProps {
  validation: ValidationResult | null;
  cptCodes: string[];
  icd10Codes: string[];
  onCodesUpdate: (cptCodes: string[], icd10Codes: string[]) => void;
}

const ValidationResultPanel: React.FC<ValidationResultPanelProps> = ({
  validation,
  cptCodes,
  icd10Codes,
  onCodesUpdate,
}) => {
  const getOverallStatus = (): 'success' | 'warning' | 'error' | 'info' => {
    if (!validation) return 'info';
    if (validation.valid && validation.warnings.length === 0) return 'success';
    if (validation.valid && validation.warnings.length > 0) return 'warning';
    return 'error';
  };

  const getStatusIcon = () => {
    const status = getOverallStatus();
    switch (status) {
      case 'success':
        return <ValidIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getStatusText = (): string => {
    if (!validation) return 'Not Validated';
    if (validation.valid && validation.warnings.length === 0) return 'Valid - No Issues';
    if (validation.valid && validation.warnings.length > 0) return 'Valid - With Warnings';
    return 'Invalid - Requires Attention';
  };

  const getComplianceLevel = (): string => {
    if (!validation) return 'Unknown';
    const score = validation.compliance_score;
    if (score >= 0.9) return 'Excellent';
    if (score >= 0.8) return 'Good';
    if (score >= 0.7) return 'Fair';
    return 'Poor';
  };

  const getRiskLevel = (): string => {
    if (!validation) return 'Unknown';
    const risk = validation.reimbursement_risk;
    if (risk <= 0.2) return 'Low';
    if (risk <= 0.5) return 'Medium';
    return 'High';
  };

  const getRiskColor = (): 'success' | 'warning' | 'error' => {
    if (!validation) return 'warning';
    const risk = validation.reimbursement_risk;
    if (risk <= 0.2) return 'success';
    if (risk <= 0.5) return 'warning';
    return 'error';
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom>
          Validation Results
        </Typography>

        {/* Overall Status */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {getStatusIcon()}
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {getStatusText()}
            </Typography>
          </Box>

          {validation && (
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  {Math.round(validation.compliance_score * 100)}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Compliance
                </Typography>
              </Box>
              
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color={getRiskColor()}>
                  {getRiskLevel()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Risk Level
                </Typography>
              </Box>
              
              {validation.estimated_reimbursement && (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="success">
                    ${validation.estimated_reimbursement.commercial_120}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Est. Revenue
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {validation && (
            <LinearProgress
              variant="determinate"
              value={validation.compliance_score * 100}
              color={getOverallStatus()}
              sx={{ height: 8, borderRadius: 4 }}
            />
          )}
        </Box>

        {/* No Validation Yet */}
        {!validation && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Enter CPT and ICD-10 codes to see validation results
          </Alert>
        )}

        {/* Validation Details */}
        {validation && (
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            {/* Errors */}
            {validation.errors.length > 0 && (
              <Accordion defaultExpanded sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ErrorIcon color="error" />
                    <Typography variant="subtitle2">
                      Errors ({validation.errors.length})
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {validation.errors.map((error, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <ErrorIcon color="error" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={error}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Warnings */}
            {validation.warnings.length > 0 && (
              <Accordion defaultExpanded sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon color="warning" />
                    <Typography variant="subtitle2">
                      Warnings ({validation.warnings.length})
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {validation.warnings.map((warning, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <WarningIcon color="warning" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={warning}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Suggestions */}
            {validation.suggestions.length > 0 && (
              <Accordion sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SuggestionIcon color="info" />
                    <Typography variant="subtitle2">
                      Suggestions ({validation.suggestions.length})
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {validation.suggestions.map((suggestion, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <SuggestionIcon color="info" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={suggestion}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Reimbursement Details */}
            {validation.estimated_reimbursement && (
              <Accordion sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <RiskIcon color="success" />
                    <Typography variant="subtitle2">
                      Reimbursement Estimates
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Medicare:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        ${validation.estimated_reimbursement.medicare}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Commercial (120%):</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        ${validation.estimated_reimbursement.commercial_120}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Commercial (150%):</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        ${validation.estimated_reimbursement.commercial_150}
                      </Typography>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Validation Metadata */}
            {validation.validation_time_ms && (
              <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Validated in {validation.validation_time_ms}ms
                  {validation.validated_at && (
                    <> at {new Date(validation.validated_at).toLocaleTimeString()}</>
                  )}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Success State */}
        {validation && validation.valid && validation.errors.length === 0 && validation.warnings.length === 0 && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ValidIcon />
              <Typography variant="body2">
                All codes are valid and compliant. Ready for submission!
              </Typography>
            </Box>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ValidationResultPanel;