import React, { useState, useRef } from 'react';
import {
  Box, Typography, Paper, Button, LinearProgress, Alert,
  Card, CardContent, List, ListItem, ListItemText, ListItemIcon,
  Chip, Divider
} from '@mui/material';
import {
  CloudUpload, CheckCircle, Error, Description
} from '@mui/icons-material';
import { patientService } from '../../services/patientService';

interface SimpleDicomUploadProps {
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
  slice_number?: number;
  total_slices?: number;
}

const SimpleDicomUpload: React.FC<SimpleDicomUploadProps> = ({ 
  patientId, 
  onUploadComplete, 
  onError 
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      setSelectedFiles([]);
      return;
    }

    // Convert FileList to Array
    const fileArray = Array.from(files);
    setSelectedFiles(fileArray);
    console.log(`📁 Selected ${fileArray.length} files:`, fileArray.map(f => f.name));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadResults([]);

    const results: UploadResult[] = [];

    try {
      if (selectedFiles.length > 1) {
        // Upload multiple files as a DICOM series
        console.log(`🚀 Uploading ${selectedFiles.length} files as DICOM series`);
        setUploadProgress(50); // Show progress during upload
        
        const response = await patientService.uploadDicomSeries(
          patientId, 
          selectedFiles, 
          `DICOM Series - ${selectedFiles.length} slices`
        );
        
        console.log('📊 Series upload response:', response);
        
        if (response.success) {
          // Create results for each file in the series
          selectedFiles.forEach((file, index) => {
            results.push({
              filename: file.name,
              success: true,
              study_uid: response.series_uid,
              processing_result: response.processing_results,
              file_size: file.size,
              upload_time: new Date().toISOString(),
              slice_number: index + 1,
              total_slices: selectedFiles.length
            });
          });
        } else {
          selectedFiles.forEach((file) => {
            results.push({
              filename: file.name,
              success: false,
              error: response.message || 'Series upload failed',
              file_size: file.size
            });
          });
        }
      } else {
        // Upload single file
        const file = selectedFiles[0];
        console.log(`🚀 Uploading single file: ${file.name}`);
        setUploadProgress(50);

        const response = await patientService.uploadFile(patientId, file, 'DICOM study');
        
        console.log('📊 Upload response:', response);

        if (response.success) {
          results.push({
            filename: file.name,
            success: true,
            study_uid: (response as any).study_uid,
            processing_result: (response as any).processing_result,
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
      }

    } catch (error: unknown) {
      console.error(`❌ Upload failed:`, error);
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
      
      // Add error results for all selected files
      selectedFiles.forEach((file) => {
        results.push({
          filename: file.name,
          success: false,
          error: errorMessage,
          file_size: file.size
        });
      });
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

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const getSuccessCount = () => {
    return uploadResults.filter(r => r.success).length;
  };

  const getTotalFileSize = () => {
    return uploadResults.reduce((total, result) => total + (result.file_size || 0), 0);
  };

  return (
    <Box>
      {/* Upload Area */}
      <Paper
        sx={{
          p: 4,
          textAlign: 'center',
          border: '2px dashed #ccc',
          cursor: uploading ? 'not-allowed' : 'pointer',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'primary.50'
          }
        }}
        onClick={!uploading ? handleUploadClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".dcm,.dicom"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          disabled={uploading}
        />
        
        <CloudUpload sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
        
        <Typography variant="h6" gutterBottom>
          📤 DICOM File Upload
        </Typography>
        
        <Typography variant="body1" gutterBottom>
          Click to select DICOM files (.dcm, .dicom)
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          Multiple files supported • Automatic processing
        </Typography>

        {uploading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={uploadProgress} 
              sx={{ mb: 1 }}
            />
            <Typography variant="body2">
              Uploading... {Math.round(uploadProgress)}%
            </Typography>
          </Box>
        )}

        {!uploading && selectedFiles.length === 0 && (
          <Button
            variant="contained"
            startIcon={<CloudUpload />}
            sx={{ mt: 2 }}
            onClick={handleUploadClick}
          >
            Select Files
          </Button>
        )}

        {/* Show selected files */}
        {selectedFiles.length > 0 && !uploading && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              📁 Selected {selectedFiles.length} file(s):
            </Typography>
            {selectedFiles.map((file, index) => (
              <Chip 
                key={index}
                label={`${file.name} (${Math.round(file.size / 1024)} KB)`}
                size="small"
                sx={{ m: 0.5 }}
              />
            ))}
            <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<CloudUpload />}
                onClick={handleUpload}
              >
                {selectedFiles.length > 1 
                  ? `Upload Series (${selectedFiles.length} slices)` 
                  : `Upload ${selectedFiles.length} File`
                }
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setSelectedFiles([]);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Clear
              </Button>
            </Box>
          </Box>
        )}
      </Paper>

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
              {uploadResults.map((result, index) => (
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
                              label={result.total_slices ? `Series Created (${result.total_slices} slices)` : "Study Created"} 
                              color="success" 
                              size="small" 
                            />
                          )}
                          {result.slice_number && (
                            <Chip 
                              label={`Slice ${result.slice_number}/${result.total_slices}`} 
                              color="info" 
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
                              {result.study_uid && ` • Series UID: ${result.study_uid.substring(0, 20)}...`}
                              {result.total_slices && ` • Part of ${result.total_slices}-slice series`}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="error.main">
                              ❌ {result.error}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < uploadResults.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default SimpleDicomUpload;