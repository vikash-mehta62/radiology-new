import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import FilePreview from '../components/FilePreview/FilePreview';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Breadcrumbs,
  Link,
  Alert,
  LinearProgress,
  Paper,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  Search as SearchIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  CreateNewFolder as CreateFolderIcon,
  Home as HomeIcon,
  Image as ImageIcon,
  Description as DocumentIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  Archive as ArchiveIcon,
  LocalHospital as MedicalIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';

const FolderManager: React.FC = () => {
  const [folders, setFolders] = useState<any[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [files, setFiles] = useState<any[]>([]);
  const [subfolders, setSubfolders] = useState<any[]>([]); // Add state for subfolders
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('info');
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Drag and drop configuration
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploadStatus('Uploading files...');
    const formData = new FormData();
    
    acceptedFiles.forEach((file) => {
      formData.append('files', file);
    });

    try {
      // Use virtual folder upload endpoint
      formData.append('folderPath', currentFolder || '');

      const response = await fetch('/api/nested-folders/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setUploadStatus('');
        setSnackbarMessage(`Successfully uploaded ${acceptedFiles.length} file(s)`);
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        
        // Reload files based on current context
        if (currentFolder) {
          loadFiles(currentFolder);
        } else {
          loadFiles('');
        }
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      setUploadStatus('');
      setSnackbarMessage('Upload failed. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  }, [currentFolder]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 500 * 1024 * 1024, // 500MB
  });

  // Load folders from API
  const loadFolders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/nested-folders');
      if (response.ok) {
        const data = await response.json();
        // Extract folders from the structure response
        setFolders(Array.isArray(data.structure) ? data.structure : []);
      } else {
        setError('Failed to load folders');
      }
    } catch (error) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Load files from a specific folder
  const loadFiles = async (folderPath: string) => {
    setLoading(true);
    try {
      // Use different endpoints for root vs specific folder
      const url = folderPath ? `/api/nested-folders/folder/${encodeURIComponent(folderPath)}` : '/api/nested-folders';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        
        if (folderPath) {
          // For specific folder, extract files and folders arrays from API response
          setFiles(Array.isArray(data.files) ? data.files : []);
          setSubfolders(Array.isArray(data.folders) ? data.folders : []); // Set subfolders
        } else {
          // For root, use the structure array as folders and no files
          setFiles([]);
          setSubfolders(Array.isArray(data.structure) ? data.structure : []);
        }
      } else {
        setError('Failed to load files');
      }
    } catch (error) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Create new folder
  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const response = await fetch('/api/nested-folders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          folderName: newFolderName,
          parentPath: currentFolder || ''
        }),
      });

      if (response.ok) {
        setCreateFolderOpen(false);
        setNewFolderName('');
        setSnackbarMessage('Folder created successfully');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        loadFolders();
      } else {
        setSnackbarMessage('Failed to create folder');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error) {
      setSnackbarMessage('Failed to create folder');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Delete folder
  const deleteFolder = async (folderPath: string) => {
    if (!window.confirm('Are you sure you want to delete this folder?')) return;

    try {
      const response = await fetch(`/api/nested-folders/folder/${encodeURIComponent(folderPath)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSnackbarMessage('Folder deleted successfully');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        loadFolders();
      } else {
        setSnackbarMessage('Failed to delete folder');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error) {
      setSnackbarMessage('Failed to delete folder');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Delete file
  const deleteFile = async (filename: string) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      // Construct virtual file path
      const virtualPath = currentFolder ? `${currentFolder}/${filename}` : filename;
      const response = await fetch(`/api/nested-folders/file/${encodeURIComponent(virtualPath)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSnackbarMessage('File deleted successfully');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        loadFiles(currentFolder);
      } else {
        setSnackbarMessage('Failed to delete file');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error) {
      setSnackbarMessage('Failed to delete file');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Get file icon based on type
  const getFileIcon = (fileType: string) => {
    switch (fileType?.toLowerCase()) {
      case 'pdf':
        return <DocumentIcon color="error" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'webp':
        return <ImageIcon color="success" />;
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
        return <VideoIcon color="info" />;
      case 'mp3':
      case 'wav':
      case 'flac':
        return <AudioIcon color="warning" />;
      case 'zip':
      case 'rar':
      case '7z':
        return <ArchiveIcon color="secondary" />;
      case 'dcm':
      case 'dicom':
        return <MedicalIcon color="primary" />;
      default:
        return <FileIcon />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle file preview
  const handlePreviewFile = (file: any) => {
    setPreviewFile(file);
    setPreviewOpen(true);
  };

  // Handle close preview
  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPreviewFile(null);
  };

  // Load folders on component mount
  useEffect(() => {
    loadFolders();
    // Load files from root folder on initial load
    loadFiles('');
  }, []);

  // Load files when folder changes
  useEffect(() => {
    if (currentFolder) {
      loadFiles(currentFolder);
    }
  }, [currentFolder]);

  const filteredFolders = (Array.isArray(folders) ? folders : []).filter(folder =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFiles = (Array.isArray(files) ? files : []).filter(file =>
    file.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSubfolders = (Array.isArray(subfolders) ? subfolders : []).filter(subfolder =>
    subfolder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        File Manager
      </Typography>

      {/* Search and Actions */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            placeholder="Search folders and files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={<CreateFolderIcon />}
              onClick={() => setCreateFolderOpen(true)}
            >
              New Folder
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Breadcrumbs */}
      {currentFolder && (
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            component="button"
            variant="body1"
            onClick={() => setCurrentFolder('')}
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Home
          </Link>
          <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
            <FolderIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            {currentFolder}
          </Typography>
        </Breadcrumbs>
      )}

      {/* Drag & Drop Upload Area */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 3,
          mb: 3,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          textAlign: 'center',
          transition: 'all 0.2s ease-in-out',
        }}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive ? 'Drop files here...' : 'Drag & drop files here, or click to select'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Supports all file types (JPG, PNG, PDF, DCM, etc.) up to 500MB each
        </Typography>
        {uploadStatus && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography variant="body2" sx={{ mt: 1 }}>
              {uploadStatus}
            </Typography>
          </Box>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Content Grid */}
      <Grid container spacing={3}>
        {/* Folders List */}
        {!currentFolder && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Folders ({filteredFolders.length})
                </Typography>
                <List>
                  {filteredFolders.map((folder) => (
                    <ListItem
                      key={folder.name}
                      button
                      onClick={() => setCurrentFolder(folder.path)}
                    >
                      <ListItemIcon>
                        <FolderIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={folder.name}
                        secondary={`${folder.fileCount || 0} files • Created ${new Date(folder.created).toLocaleDateString()}`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFolder(folder.path);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                  {filteredFolders.length === 0 && !loading && (
                    <ListItem>
                      <ListItemText
                        primary="No folders found"
                        secondary="Create a new folder to get started"
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Root Files List */}
        {!currentFolder && filteredFiles.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Files in Root Folder ({filteredFiles.length})
                </Typography>
                <List>
                  {filteredFiles.map((file) => (
                    <ListItem key={file.filename}>
                      <ListItemIcon>
                        {getFileIcon(file.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Button
                            variant="text"
                            onClick={() => handlePreviewFile(file)}
                            sx={{ 
                              textTransform: 'none', 
                              justifyContent: 'flex-start',
                              p: 0,
                              minWidth: 'auto',
                              color: 'text.primary',
                              '&:hover': {
                                backgroundColor: 'transparent',
                                textDecoration: 'underline'
                              }
                            }}
                          >
                            {file.filename}
                          </Button>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" component="span">
                              {formatFileSize(file.size)} • {file.type} • 
                              Created {new Date(file.created).toLocaleDateString()} at {new Date(file.created).toLocaleTimeString()}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Preview">
                            <IconButton
                              edge="end"
                              onClick={() => handlePreviewFile(file)}
                            >
                              <SearchIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download">
                            <IconButton
                              edge="end"
                              onClick={() => window.open(file.downloadUrl, '_blank')}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              edge="end"
                              onClick={() => deleteFile(file.filename)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Files List */}
        {currentFolder && (
          <Grid item xs={12}>
            {/* Subfolders Section */}
            {filteredSubfolders.length > 0 && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Subfolders ({filteredSubfolders.length})
                  </Typography>
                  <List>
                    {filteredSubfolders.map((subfolder) => (
                      <ListItem
                        key={subfolder.id}
                        button
                        onClick={() => setCurrentFolder(subfolder.path)}
                      >
                        <ListItemIcon>
                          <FolderIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={subfolder.name}
                          secondary={`${subfolder.fileCount || 0} files • Created ${new Date(subfolder.created).toLocaleDateString()}`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFolder(subfolder.path);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            )}

            {/* Files Section */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Files in {currentFolder} ({filteredFiles.length})
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={() => setCurrentFolder('')}
                  >
                    Back to Folders
                  </Button>
                </Box>
                <List>
                  {filteredFiles.map((file) => (
                    <ListItem key={file.filename}>
                      <ListItemIcon>
                        {getFileIcon(file.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Button
                            variant="text"
                            onClick={() => handlePreviewFile(file)}
                            sx={{ 
                              textTransform: 'none', 
                              justifyContent: 'flex-start',
                              p: 0,
                              minWidth: 'auto',
                              color: 'text.primary',
                              '&:hover': {
                                backgroundColor: 'transparent',
                                textDecoration: 'underline'
                              }
                            }}
                          >
                            {file.filename}
                          </Button>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" component="span">
                              {formatFileSize(file.size)} • {file.type} • 
                              Created {new Date(file.created).toLocaleDateString()} at {new Date(file.created).toLocaleTimeString()}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Preview">
                            <IconButton
                              edge="end"
                              onClick={() => handlePreviewFile(file)}
                            >
                              <SearchIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download">
                            <IconButton
                              edge="end"
                              onClick={() => window.open(file.downloadUrl, '_blank')}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              edge="end"
                              onClick={() => deleteFile(file.filename)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                  {filteredFiles.length === 0 && !loading && (
                    <ListItem>
                      <ListItemText
                        primary="No files found"
                        secondary="Upload files using the drag & drop area above"
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Create Folder Dialog */}
      <Dialog open={createFolderOpen} onClose={() => setCreateFolderOpen(false)}>
        <DialogTitle>Create New Folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Folder Name"
            fullWidth
            variant="outlined"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                createFolder();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateFolderOpen(false)}>Cancel</Button>
          <Button onClick={createFolder} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* File Preview Component */}
      <FilePreview
        open={previewOpen}
        onClose={handleClosePreview}
        file={previewFile}
      />
    </Box>
  );
};

export default FolderManager;