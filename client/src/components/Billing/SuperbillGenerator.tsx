import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Divider,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Print as PrintIcon,
  Download as DownloadIcon,
  Send as SendIcon,
  CheckCircle as ValidIcon,
  Warning as WarningIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';

interface SuperbillGeneratorProps {
  superbill: any;
  onExport: (format: 'pdf' | 'json' | '837p') => void;
}

const SuperbillGenerator: React.FC<SuperbillGeneratorProps> = ({
  superbill,
  onExport,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'json' | '837p'>('pdf');

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Invalid Date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptIcon color="primary" />
          <Typography variant="h6">
            Superbill #{superbill.superbill_id?.slice(-8)}
          </Typography>
          <Chip
            label={superbill.validated ? 'Validated' : 'Pending Validation'}
            color={superbill.validated ? 'success' : 'warning'}
            size="small"
            icon={superbill.validated ? <ValidIcon /> : <WarningIcon />}
          />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Print Superbill">
            <IconButton onClick={() => window.print()}>
              <PrintIcon />
            </IconButton>
          </Tooltip>
          
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => onExport('pdf')}
            size="small"
          >
            Export PDF
          </Button>
          
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={() => onExport('837p')}
            size="small"
          >
            Export 837P
          </Button>
        </Box>
      </Box>

      {/* Validation Status */}
      {superbill.validation_errors && superbill.validation_errors.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Validation Issues:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {superbill.validation_errors.map((error: string, index: number) => (
              <li key={index}>
                <Typography variant="body2">{error}</Typography>
              </li>
            ))}
          </ul>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Provider Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Provider Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2">
                  <strong>Facility:</strong> {superbill.facility_name}
                </Typography>
                <Typography variant="body2">
                  <strong>NPI:</strong> {superbill.provider_npi}
                </Typography>
                {superbill.facility_address && (
                  <Typography variant="body2">
                    <strong>Address:</strong> {superbill.facility_address}
                  </Typography>
                )}
                <Typography variant="body2">
                  <strong>Date of Service:</strong> {formatDate(superbill.created_at)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Patient Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Patient Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2">
                  <strong>Patient ID:</strong> {superbill.patient_info.patient_id}
                </Typography>
                <Typography variant="body2">
                  <strong>Name:</strong> {superbill.patient_info.name}
                </Typography>
                <Typography variant="body2">
                  <strong>DOB:</strong> {formatDate(superbill.patient_info.dob)}
                </Typography>
                <Typography variant="body2">
                  <strong>Gender:</strong> {superbill.patient_info.gender}
                </Typography>
                {superbill.patient_info.insurance && (
                  <Typography variant="body2">
                    <strong>Insurance:</strong> {superbill.patient_info.insurance.payer_name || 'Primary Insurance'}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Services */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Services Provided
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>CPT Code</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="center">Units</TableCell>
                      <TableCell align="right">Charge</TableCell>
                      <TableCell>Modifiers</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {superbill.services.map((service: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {service.cpt_code}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {service.description}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">
                            {service.units}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatCurrency(service.charge)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {service.modifiers && service.modifiers.length > 0 ? (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {service.modifiers.map((modifier: string, idx: number) => (
                                <Chip
                                  key={idx}
                                  label={modifier}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              None
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Diagnoses */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Diagnosis Codes
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ICD-10 Code</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="center">Primary</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {superbill.diagnoses.map((diagnosis: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {diagnosis.icd10_code}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {diagnosis.description}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {diagnosis.primary ? (
                            <Chip label="Primary" color="primary" size="small" />
                          ) : (
                            <Chip label="Secondary" color="default" size="small" variant="outlined" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Summary */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Billing Summary
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Total Charges:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatCurrency(superbill.total_charges)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Services Count:</Typography>
                    <Typography variant="body2">
                      {superbill.services.length}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Diagnosis Count:</Typography>
                    <Typography variant="body2">
                      {superbill.diagnoses.length}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Status:</Typography>
                    <Chip
                      label={superbill.submitted ? 'Submitted' : 'Ready to Submit'}
                      color={superbill.submitted ? 'success' : 'primary'}
                      size="small"
                    />
                  </Box>
                  
                  {superbill.submission_date && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Submitted:</Typography>
                      <Typography variant="body2">
                        {formatDate(superbill.submission_date)}
                      </Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Created:</Typography>
                    <Typography variant="body2">
                      {formatDate(superbill.created_at)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* 837P Information */}
              {superbill.x12_837p_data && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    837P Transaction Details
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Transaction ready for electronic submission to clearinghouse.
                    Contains all required segments and data elements for HIPAA compliance.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SuperbillGenerator;