import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  IconButton,
  Alert,
} from '@mui/material';
import {
  TrendingUp as RevenueIcon,
  TrendingDown as RiskIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';

import { ValidationResult } from '../../types';

interface ReimbursementEstimatorProps {
  cptCodes: string[];
  icd10Codes: string[];
  validation: ValidationResult | null;
}

interface ReimbursementBreakdown {
  cptCode: string;
  description: string;
  units: number;
  medicareRate: number;
  commercial120: number;
  commercial150: number;
  rvu: number;
}

const ReimbursementEstimator: React.FC<ReimbursementEstimatorProps> = ({
  cptCodes,
  icd10Codes,
  validation,
}) => {
  const [breakdown, setBreakdown] = useState<ReimbursementBreakdown[]>([]);
  const [totalEstimates, setTotalEstimates] = useState({
    medicare: 0,
    commercial120: 0,
    commercial150: 0,
  });

  // Mock reimbursement data - in real implementation, this would come from API
  const mockReimbursementData: Record<string, ReimbursementBreakdown> = {
    '93306': {
      cptCode: '93306',
      description: 'Echocardiography, complete',
      units: 1,
      medicareRate: 185.50,
      commercial120: 222.60,
      commercial150: 278.25,
      rvu: 2.85,
    },
    '93880': {
      cptCode: '93880',
      description: 'Duplex scan extracranial arteries',
      units: 1,
      medicareRate: 165.75,
      commercial120: 198.90,
      commercial150: 248.63,
      rvu: 2.55,
    },
    '76700': {
      cptCode: '76700',
      description: 'Ultrasound, abdominal, complete',
      units: 1,
      medicareRate: 145.25,
      commercial120: 174.30,
      commercial150: 217.88,
      rvu: 2.23,
    },
  };

  useEffect(() => {
    if (cptCodes.length > 0) {
      const newBreakdown = cptCodes.map(code => 
        mockReimbursementData[code] || {
          cptCode: code,
          description: 'Unknown procedure',
          units: 1,
          medicareRate: 0,
          commercial120: 0,
          commercial150: 0,
          rvu: 0,
        }
      );

      setBreakdown(newBreakdown);

      // Calculate totals
      const totals = newBreakdown.reduce(
        (acc, item) => ({
          medicare: acc.medicare + item.medicareRate * item.units,
          commercial120: acc.commercial120 + item.commercial120 * item.units,
          commercial150: acc.commercial150 + item.commercial150 * item.units,
        }),
        { medicare: 0, commercial120: 0, commercial150: 0 }
      );

      setTotalEstimates(totals);
    } else {
      setBreakdown([]);
      setTotalEstimates({ medicare: 0, commercial120: 0, commercial150: 0 });
    }
  }, [cptCodes]);

  const getDenialRisk = (): number => {
    return validation?.reimbursement_risk || 0;
  };

  const getRiskColor = (): 'success' | 'warning' | 'error' => {
    const risk = getDenialRisk();
    if (risk <= 0.2) return 'success';
    if (risk <= 0.5) return 'warning';
    return 'error';
  };

  const getRiskLabel = (): string => {
    const risk = getDenialRisk();
    if (risk <= 0.2) return 'Low Risk';
    if (risk <= 0.5) return 'Medium Risk';
    return 'High Risk';
  };

  const getExpectedReimbursement = (baseAmount: number): number => {
    const risk = getDenialRisk();
    return baseAmount * (1 - risk);
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom>
          Reimbursement Estimator
        </Typography>

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
              <Typography variant="h5" color="primary" sx={{ fontWeight: 600 }}>
                ${totalEstimates.medicare.toFixed(0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Medicare Rate
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
              <Typography variant="h5" color="success.main" sx={{ fontWeight: 600 }}>
                ${totalEstimates.commercial120.toFixed(0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Commercial (120%)
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
              <Typography variant="h5" color="info.main" sx={{ fontWeight: 600 }}>
                ${totalEstimates.commercial150.toFixed(0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Commercial (150%)
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Risk Assessment */}
        {validation && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Denial Risk Assessment</Typography>
              <Chip
                label={getRiskLabel()}
                color={getRiskColor()}
                size="small"
                icon={getRiskColor() === 'error' ? <WarningIcon /> : <CheckIcon />}
              />
            </Box>
            
            <LinearProgress
              variant="determinate"
              value={getDenialRisk() * 100}
              color={getRiskColor()}
              sx={{ height: 8, borderRadius: 4, mb: 1 }}
            />
            
            <Typography variant="caption" color="text.secondary">
              Expected reimbursement after risk adjustment: ${getExpectedReimbursement(totalEstimates.commercial120).toFixed(0)}
            </Typography>
          </Box>
        )}

        {/* Detailed Breakdown */}
        {breakdown.length > 0 && (
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            <Typography variant="subtitle2" gutterBottom>
              Detailed Breakdown
            </Typography>
            
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>CPT Code</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">RVU</TableCell>
                    <TableCell align="right">Medicare</TableCell>
                    <TableCell align="right">Commercial</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {breakdown.map((item) => (
                    <TableRow key={item.cptCode}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {item.cptCode}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {item.description}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {item.rvu.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          ${item.medicareRate.toFixed(0)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          ${item.commercial120.toFixed(0)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* No Data State */}
        {breakdown.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <RevenueIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Add CPT codes to see reimbursement estimates
            </Typography>
          </Box>
        )}

        {/* Compliance Notes */}
        {validation && validation.valid && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Compliance Note:</strong> All codes are properly matched and compliant with current billing guidelines.
              Estimated processing time: 2-3 business days.
            </Typography>
          </Alert>
        )}

        {/* Risk Factors */}
        {validation && getDenialRisk() > 0.3 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Risk Factors:</strong> High denial risk detected. Consider reviewing code combinations and ensuring proper documentation.
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ReimbursementEstimator;