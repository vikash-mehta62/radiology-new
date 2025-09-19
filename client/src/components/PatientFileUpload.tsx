import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  InsertDriveFile as FileIcon,
  Delete as DeleteIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { patientService, PatientFile } from '../services/patientService';

interface PatientFileUploadProps {
  patientId: string;
  onUploadComplete?: (files: PatientFile[]) => void;
  onError?: (error: string) => void;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  success: string | null;
  selectedFiles: File[];
}

const PatientFileUpload: React.FC<PatientFileUploadProps> = ({
  patientId,
  onUploadComplete,
  onError,
}) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    success: null,
    selectedFiles: [],
  });
  
  const [description, setDescription] = useState('');
  const [showDescriptionDialog, setShowDescriptionDialog] = useState(false);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      setUploadState(prev => ({
        ...prev,
        selectedFiles: fileArray,
        error: null,
        success: null,
      }));
    }
  }, []);

  // Remove selected file
  const handleRemoveFile = useCallback((index: number) => {
    setUploadState(prev => ({
      ...prev,
      selectedFiles: prev.selectedFiles.filter((_, i) => i !== index),
    }));
  }, []);

  // Upload files
  const handleUpload = useCallback(async () => {
    if (uploadState.selectedFiles.length === 0) {
      setUploadState(prev => ({ ...prev, error: 'Please select files to upload' }));
      return;
    }

    if (!patientId) {
      setUploadState(prev => ({ ...prev, error: 'Patient ID is required' }));
      return;
    }

    setUploadState(prev => ({
      ...prev,
      isUploading: true,
      progress: 0,
      error: null,
      success: null,
    }));

    try {
      const uploadedFiles: PatientFile[] = [];
      const totalFiles = uploadState.selectedFiles.length;

      for (let i = 0; i < uploadState.selectedFiles.length; i++) {
        const file = uploadState.selectedFiles[i];
        
        // Update progress
        setUploadState(prev => ({
          ...prev,
          progress: Math.round(((i + 0.5) / totalFiles) * 100),
        }));

        try {
          const result = await patientService.uploadFile(patientId, file, description);
          uploadedFiles.push(result.file);
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          throw new Error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Update progress
        setUploadState(prev => ({
          ...prev,
          progress: Math.round(((i + 1) / totalFiles) * 100),
        }));
      }

      // Success
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        progress: 100,
        success: `Successfully uploaded ${uploadedFiles.length} file(s)`,
        selectedFiles: [],
      }));

      setDescription('');
      
      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete(uploadedFiles);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        progress: 0,
        error: errorMessage,
      }));

      if (onError) {
        onError(errorMessage);
      }
    }
  }, [uploadState.selectedFiles, patientId, description, onUploadComplete, onError]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file type chip color
  const getFileTypeColor = (filename: string): 'primary' | 'secondary' | 'success' | 'warning' => {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'dcm':
      case 'dicom':
        return 'primary';
      case 'pdf':
        return 'secondary';
      case 'jpg':
      case 'jpeg':
      case 'png':
        return 'success';
      default:
        return 'warning';
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Upload Patient Files
        </Typography>

        {/* File Selection */}
        <Box sx={{ mb: 2 }}>
          <input
            accept="*/*"
            style={{ display: 'none' }}
            id="file-upload-input"
            multiple
            type="file"
            onChange={handleFileSelect}
            disabled={uploadState.isUploading}
          />
          <label htmlFor="file-upload-input">
            <Button
              variant="outlined"
              component="span"
              startIcon={<UploadIcon />}
              disabled={uploadState.isUploading}
              fullWidth
            >
              Select Files
            </Button>
          </label>
        </Box>

        {/* Selected Files List */}
        {uploadState.selectedFiles.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Selected Files ({uploadState.selectedFiles.length})
            </Typography>
            <List dense>
              {uploadState.selectedFiles.map((file, index) => (
                <ListItem
                  key={index}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      onClick={() => handleRemoveFile(index)}
                      disabled={uploadState.isUploading}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemIcon>
                    <FileIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={file.name}
                    secondary={formatFileSize(file.size)}
                  />
                  <Chip
                    label={file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                    size="small"
                    color={getFileTypeColor(file.name)}
                    sx={{ ml: 1 }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Description Button */}
        {uploadState.selectedFiles.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Button
              variant="text"
              onClick={() => setShowDescriptionDialog(true)}
              disabled={uploadState.isUploading}
            >
              {description ? 'Edit Description' : 'Add Description (Optional)'}
            </Button>
            {description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Description: {description}
              </Typography>
            )}
          </Box>
        )}

        {/* Upload Button */}
        {uploadState.selectedFiles.length > 0 && (
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={uploadState.isUploading}
            startIcon={uploadState.isUploading ? undefined : <UploadIcon />}
            fullWidth
          >
            {uploadState.isUploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        )}

        {/* Progress Bar */}
        {uploadState.isUploading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={uploadState.progress} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {uploadState.progress}% Complete
            </Typography>
          </Box>
        )}

        {/* Success Message */}
        {uploadState.success && (
          <Alert severity="success" icon={<SuccessIcon />} sx={{ mt: 2 }}>
            {uploadState.success}
          </Alert>
        )}

        {/* Error Message */}
        {uploadState.error && (
          <Alert severity="error" icon={<ErrorIcon />} sx={{ mt: 2 }}>
            {uploadState.error}
          </Alert>
        )}

        {/* Description Dialog */}
        <Dialog open={showDescriptionDialog} onClose={() => setShowDescriptionDialog(false)}>
          <DialogTitle>Add File Description</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Description"
              fullWidth
              variant="outlined"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description for the uploaded files..."
              multiline
              rows={3}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDescriptionDialog(false)}>Cancel</Button>
            <Button onClick={() => setShowDescriptionDialog(false)} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default PatientFileUpload;