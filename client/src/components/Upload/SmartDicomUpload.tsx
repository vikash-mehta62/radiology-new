import React, { useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, LinearProgress, Alert,
  Card, CardContent, Grid, Chip, IconButton, Collapse,
  List, ListItem, ListItemText, ListItemIcon, Divider
} from '@mui/material';
import {
  CloudUpload, CheckCircle, Error, Info, Visibility,
  Image, Description, Timeline, Speed
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { patientService } from '../../services/patientService';

interface SmartDicomUploadProps {
  patientId: string;
  onUploadComplete?: (results: any[]) => void;
  onError?: (error: string) => void;
}

interface UploadResult {
  filename: string;
  success: boolean;
  study_uid?: string;
  processing_result?: any;
  error?: string;
  file_size?: number;
  upload_time?: string;
}

const SmartDicomUpload: React.FC<SmartDicomUploadProps> = ({
  patientId,
  onUploadComplete,
  onError
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setSelectedFiles(acceptedFiles);
    console.log(`📁 Selected ${acceptedFiles.length} files via drag & drop:`, acceptedFiles.map(f => f.name));
  }, []);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadResults([]);

    const results: UploadResult[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      try {
        console.log(`🚀 Smart upload starting: ${file.name}`);

        // Update progress
        setUploadProgress((i / selectedFiles.length) * 100);

        // Upload file
        const response = await patientService.uploadFile(patientId, file, 'DICOM study');

        console.log('📊 Upload response:', response);

        if (response.success) {
          results.push({
            filename: file.name,
            success: true,
            study_uid: response.study_uid,
            processing_result: response.processing_result,
            file_size: file.size,
            upload_time: new Date().toISOString()
          });
        } else {
          results.push({
            filename: file.name,
            success: false,
            error: response.message || 'Upload failed',
            file_size: file.size
          });
        }

      } catch (error: unknown) {
        console.error(`❌ Upload failed for ${file.name}:`, error);
        let errorMessage = 'Upload failed';

        // Safe error message extraction
        if (error && typeof error === 'object') {
          if ('message' in error && typeof (error as any).message === 'string') {
            errorMessage = (error as any).message;
          } else if ('toString' in error && typeof (error as any).toString === 'function') {
            errorMessage = (error as any).toString();
          }
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        results.push({
          filename: file.name,
          success: false,
          error: errorMessage,
          file_size: file.size
        });
      }
    }

    setUploadProgress(100);
    setUploadResults(results);
    setUploading(false);

    // Clear selected files after upload
    setSelectedFiles([]);

    // Notify parent component
    if (onUploadComplete) {
      onUploadComplete(results);
    }

    // Show details if there are any processing results
    const hasProcessingResults = results.some(r => r.processing_result);
    if (hasProcessingResults) {
      setShowDetails(true);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/dicom': ['.dcm', '.dicom'],
      'application/octet-stream': ['.dcm', '.dicom']
    },
    multiple: true,
    disabled: uploading
  });

  const getProcessingStatus = (result: UploadResult) => {
    if (!result.processing_result) return null;

    const processing = result.processing_result;
    if (processing.success) {
      return {
        status: 'success',
        message: `Processed successfully - ${processing.processing_type || 'advanced'} processing`,
        details: processing.processed_files
      };
    } else {
      return {
        status: 'error',
        message: processing.error || 'Processing failed',
        suggestion: processing.suggestion
      };
    }
  };

  const getTotalFileSize = () => {
    return uploadResults.reduce((total, result) => total + (result.file_size || 0), 0);
  };

  const getSuccessCount = () => {
    return uploadResults.filter(r => r.success).length;
  };

  return (
    <Box>
      {/* Smart Upload Zone */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          textAlign: 'center',
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          bgcolor: isDragActive ? 'primary.50' : 'background.paper',
          cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'primary.50'
          }
        }}
      >
        <input {...getInputProps()} />

        <CloudUpload
          sx={{
            fontSize: 48,
            color: isDragActive ? 'primary.main' : 'grey.400',
            mb: 2
          }}
        />

        <Typography variant="h6" gutterBottom>
          🧠 Smart DICOM Upload
        </Typography>

        {isDragActive ? (
          <Typography variant="body1" color="primary">
            Drop DICOM files here for intelligent processing...
          </Typography>
        ) : (
          <Box>
            <Typography variant="body1" gutterBottom>
              Drag & drop DICOM files here, or click to select
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supports .dcm and .dicom files • Automatic processing • Preview generation
            </Typography>
          </Box>
        )}

        {uploading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={uploadProgress}
              sx={{ mb: 1 }}
            />
            <Typography variant="body2">
              Processing... {Math.round(uploadProgress)}%
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Show selected files */}
      {selectedFiles.length > 0 && !uploading && (
        <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            📁 Selected {selectedFiles.length} file(s) for smart processing:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {selectedFiles.map((file, index) => (
              <Chip
                key={index}
                label={`${file.name} (${Math.round(file.size / 1024)} KB)`}
                size="small"
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<CloudUpload />}
              onClick={handleUpload}
              size="large"
            >
              🧠 Smart Upload {selectedFiles.length} File(s)
            </Button>
            <Button
              variant="outlined"
              onClick={() => setSelectedFiles([])}
            >
              Clear Selection
            </Button>
          </Box>
        </Paper>
      )}

      {/* Upload Results */}
      {uploadResults.length > 0 && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                📊 Upload Results
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label={`${getSuccessCount()}/${uploadResults.length} successful`}
                  color={getSuccessCount() === uploadResults.length ? 'success' : 'warning'}
                  size="small"
                />
                <Chip
                  label={`${Math.round(getTotalFileSize() / 1024)} KB total`}
                  variant="outlined"
                  size="small"
                />
              </Box>
            </Box>

            <List dense>
              {uploadResults.map((result, index) => {
                const processing = getProcessingStatus(result);

                return (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemIcon>
                        {result.success ? (
                          <CheckCircle color="success" />
                        ) : (
                          <Error color="error" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2">
                              {result.filename}
                            </Typography>
                            {result.success && result.study_uid && (
                              <Chip
                                label="Study Created"
                                color="success"
                                size="small"
                              />
                            )}
                            {processing?.status === 'success' && (
                              <Chip
                                label="Processed"
                                color="primary"
                                size="small"
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            {result.success ? (
                              <Typography variant="body2" color="success.main">
                                ✅ Uploaded successfully
                                {result.study_uid && ` • Study UID: ${result.study_uid.substring(0, 20)}...`}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="error.main">
                                ❌ {result.error}
                              </Typography>
                            )}

                            {processing && (
                              <Typography
                                variant="body2"
                                color={processing.status === 'success' ? 'primary.main' : 'error.main'}
                                sx={{ mt: 0.5 }}
                              >
                                🔄 {processing.message}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < uploadResults.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>

            {/* Processing Details */}
            {uploadResults.some(r => r.processing_result) && (
              <Box sx={{ mt: 2 }}>
                <Button
                  startIcon={<Info />}
                  onClick={() => setShowDetails(!showDetails)}
                  size="small"
                  variant="outlined"
                >
                  {showDetails ? 'Hide' : 'Show'} Processing Details
                </Button>

                <Collapse in={showDetails}>
                  <Box sx={{ mt: 2 }}>
                    {uploadResults.map((result, index) => {
                      if (!result.processing_result || !result.success) return null;

                      const processing = result.processing_result;

                      return (
                        <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                          <CardContent>
                            <Typography variant="subtitle2" gutterBottom>
                              🔬 Processing Details - {result.filename}
                            </Typography>

                            <Grid container spacing={2}>
                              <Grid item xs={12} md={6}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  Processing Type:
                                </Typography>
                                <Chip
                                  label={processing.processing_type || 'Advanced'}
                                  color="primary"
                                  size="small"
                                />
                              </Grid>

                              {processing.processed_files && (
                                <Grid item xs={12} md={6}>
                                  <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Generated Files:
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                    {Object.keys(processing.processed_files).map(fileType => (
                                      <Chip
                                        key={fileType}
                                        label={fileType}
                                        size="small"
                                        variant="outlined"
                                        icon={fileType.includes('preview') ? <Image /> : <Description />}
                                      />
                                    ))}
                                  </Box>
                                </Grid>
                              )}

                              {processing.metadata && (
                                <Grid item xs={12}>
                                  <Typography variant="body2" color="text.secondary" gutterBottom>
                                    DICOM Metadata:
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                    <Chip label={`Patient: ${processing.metadata.patient_name || 'Unknown'}`} size="small" />
                                    <Chip label={`Modality: ${processing.metadata.modality || 'Unknown'}`} size="small" />
                                    {processing.metadata.study_date && (
                                      <Chip label={`Date: ${processing.metadata.study_date}`} size="small" />
                                    )}
                                  </Box>
                                </Grid>
                              )}
                            </Grid>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Box>
                </Collapse>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default SmartDicomUpload;