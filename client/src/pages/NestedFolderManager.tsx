import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  IconButton,
  Chip,
  LinearProgress,
  Snackbar,
  Alert,
  Breadcrumbs,
  Link,
  Menu,
  MenuItem,
  Tooltip,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider
} from '@mui/material';
import {
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  InsertDriveFile as FileIcon,
  Add as AddIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  MoreVert as MoreVertIcon,
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
  CloudUpload as CloudUploadIcon,
  Image as ImageIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  PictureAsPdf as PdfIcon,
  Description as DocumentIcon,
  Archive as ArchiveIcon,
  LocalHospital as MedicalIcon
} from '@mui/icons-material';

interface NestedFolder {
  id: string;
  name: string;
  path: string;
  type: 'folder';
  created: string;
  modified: string;
  fileCount: number;
  subfolderCount: number;
  totalSize: number;
  depth: number;
  subFolders?: NestedFolder[];
}

interface NestedFile {
  id: string;
  filename: string;
  path: string;
  size: number;
  type: string;
  extension: string;
  mimeType: string;
  created: string;
  modified: string;
  downloadUrl: string;
  storagePath: string;
  uploadedBy?: string;
  downloadCount: number;
}

interface FolderContents {
  folder: {
    id: string;
    name: string;
    path: string;
    parentPath: string;
    depth: number;
    created: string;
    modified: string;
  };
  folders: NestedFolder[];
  files: NestedFile[];
  totalItems: number;
}

const NestedFolderManager: React.FC = () => {
  const [folderStructure, setFolderStructure] = useState<NestedFolder[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [currentContents, setCurrentContents] = useState<FolderContents>({
    folder: {
      id: '',
      name: '',
      path: '',
      parentPath: '',
      depth: 0,
      created: '',
      modified: ''
    },
    folders: [],
    files: [],
    totalItems: 0
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Dialog states
  const [createFolderOpen, setCreateFolderOpen] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  
  // Upload states
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  
  // Snackbar states
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  
  // Menu states
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = useState<NestedFolder | NestedFile | null>(null);

  // Load folder structure on component mount
  useEffect(() => {
    loadFolderStructure();
    loadFolderContents('');
  }, []);

  const loadFolderStructure = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/nested-folders');
      const data = await response.json();
      
      if (data.success) {
        setFolderStructure(data.folders || []);
      } else {
        setError(data.message || 'Failed to load folder structure');
      }
    } catch (error) {
      console.error('Error loading folder structure:', error);
      setError('Failed to load folder structure');
    } finally {
      setLoading(false);
    }
  };

  const loadFolderContents = async (path: string) => {
    try {
      setLoading(true);
      const url = path ? `/api/nested-folders/folder/${encodeURIComponent(path)}` : '/api/nested-folders/folder/';
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setCurrentContents({
          folder: data.folder || {
            id: '',
            name: 'Root',
            path: '',
            parentPath: '',
            depth: 0,
            created: '',
            modified: ''
          },
          folders: data.folders || [],
          files: data.files || [],
          totalItems: data.totalItems || 0
        });
        setCurrentPath(data.folder?.path || '');
      } else {
        setError(data.message || 'Failed to load folder contents');
      }
    } catch (error) {
      console.error('Error loading folder contents:', error);
      setError('Failed to load folder contents');
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      showSnackbar('Please enter a folder name', 'error');
      return;
    }

    try {
      const response = await fetch('/api/nested-folders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderName: newFolderName.trim(),
          parentPath: currentPath
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        showSnackbar('Folder created successfully', 'success');
        setCreateFolderOpen(false);
        setNewFolderName('');
        await loadFolderStructure();
        await loadFolderContents(currentPath);
      } else {
        showSnackbar(data.message || 'Failed to create folder', 'error');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      showSnackbar('Failed to create folder', 'error');
    }
  };

  const uploadFiles = async (files: FileList) => {
    if (files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });
    formData.append('folderPath', currentPath);

    try {
      setUploadStatus('Uploading files...');
      setUploadProgress(0);

      const response = await fetch('/api/nested-folders/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        showSnackbar(`Successfully uploaded ${data.files.length} file(s)`, 'success');
        await loadFolderContents(currentPath);
      } else {
        showSnackbar(data.message || 'Failed to upload files', 'error');
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      showSnackbar('Failed to upload files', 'error');
    } finally {
      setUploadStatus('');
      setUploadProgress(0);
    }
  };

  const deleteItem = async (item: NestedFolder | NestedFile) => {
    try {
      const isFolder = 'fileCount' in item;
      const endpoint = isFolder ? `/api/nested-folders/folder/${encodeURIComponent(item.path)}` : `/api/nested-folders/file/${encodeURIComponent(item.path)}`;
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        showSnackbar(`${isFolder ? 'Folder' : 'File'} deleted successfully`, 'success');
        await loadFolderStructure();
        await loadFolderContents(currentPath);
      } else {
        showSnackbar(data.message || `Failed to delete ${isFolder ? 'folder' : 'file'}`, 'error');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      showSnackbar(`Failed to delete ${('fileCount' in item) ? 'folder' : 'file'}`, 'error');
    }
    handleMenuClose();
  };

  const navigateToFolder = (folderPath: string) => {
    loadFolderContents(folderPath);
  };

  const navigateUp = () => {
    if (currentPath) {
      const parentPath = currentPath.split('/').slice(0, -1).join('/');
      loadFolderContents(parentPath);
    }
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index === 0) {
      loadFolderContents('');
    } else {
      const pathParts = currentPath.split('/');
      const newPath = pathParts.slice(0, index).join('/');
      loadFolderContents(newPath);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, item: NestedFolder | NestedFile) => {
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string, extension: string) => {
    switch (type) {
      case 'image': return <ImageIcon color="primary" />;
      case 'video': return <VideoIcon color="secondary" />;
      case 'audio': return <AudioIcon color="info" />;
      case 'document': 
        return extension === 'pdf' ? <PdfIcon color="error" /> : <DocumentIcon color="action" />;
      case 'archive': return <ArchiveIcon color="warning" />;
      case 'medical': return <MedicalIcon color="success" />;
      default: return <FileIcon color="action" />;
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadFiles(files);
    }
  }, [currentPath]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
  };

  const pathParts = currentPath ? currentPath.split('/') : [];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Nested Folder Manager
      </Typography>

      {/* Breadcrumb Navigation */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
          <Link
            component="button"
            variant="body1"
            onClick={() => navigateToBreadcrumb(0)}
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Root
          </Link>
          {pathParts.map((part, index) => (
            <Link
              key={index}
              component="button"
              variant="body1"
              onClick={() => navigateToBreadcrumb(index + 1)}
            >
              {part}
            </Link>
          ))}
        </Breadcrumbs>
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateFolderOpen(true)}
        >
          Create Folder
        </Button>
        
        <Button
          variant="outlined"
          component="label"
          startIcon={<UploadIcon />}
        >
          Upload Files
          <input
            type="file"
            hidden
            multiple
            onChange={handleFileInputChange}
          />
        </Button>

        {currentPath && (
          <Button
            variant="text"
            onClick={navigateUp}
          >
            Go Up
          </Button>
        )}
      </Box>

      {/* Upload Progress */}
      {uploadStatus && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="textSecondary">
            {uploadStatus}
          </Typography>
          <LinearProgress variant="indeterminate" sx={{ mt: 1 }} />
        </Box>
      )}

      {/* Drag and Drop Area */}
      <Paper
        sx={{
          p: 4,
          mb: 3,
          border: isDragOver ? '2px dashed #1976d2' : '2px dashed #ccc',
          backgroundColor: isDragOver ? 'rgba(25, 118, 210, 0.1)' : 'transparent',
          textAlign: 'center',
          cursor: 'pointer'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="textSecondary">
          Drag and drop files here or click "Upload Files" button
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Supports all file types up to 500MB
        </Typography>
      </Paper>

      {/* Loading */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Folder Contents */}
      <Grid container spacing={3}>
        {/* Folders */}
        {currentContents.folders.map((folder) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={folder.path}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                '&:hover': { elevation: 4 },
                transition: 'all 0.2s'
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <FolderIcon color="primary" sx={{ mr: 1, fontSize: 32 }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography 
                      variant="subtitle1" 
                      noWrap
                      onClick={() => navigateToFolder(folder.path)}
                    >
                      {folder.name}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, folder)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  {folder.fileCount} items
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Modified: {new Date(folder.modified).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* Files */}
        {currentContents.files.map((file) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={file.path}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {getFileIcon(file.type, file.extension)}
                  <Box sx={{ flexGrow: 1, ml: 1 }}>
                    <Typography variant="subtitle2" noWrap>
                      {file.filename}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, file)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>
                <Chip 
                  label={file.extension.toUpperCase()} 
                  size="small" 
                  sx={{ mb: 1 }} 
                />
                <Typography variant="body2" color="textSecondary">
                  {formatFileSize(file.size)}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Modified: {new Date(file.modified).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Empty State */}
      {!loading && currentContents.folders.length === 0 && currentContents.files.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', mt: 3 }}>
          <FolderOpenIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary">
            This folder is empty
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Create a new folder or upload files to get started
          </Typography>
        </Paper>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedItem && 'filename' in selectedItem && (
          <MenuItem onClick={() => window.open(selectedItem.downloadUrl, '_blank')}>
            <ListItemIcon>
              <DownloadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Download</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => selectedItem && deleteItem(selectedItem)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

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
          <Button onClick={createFolder} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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
    </Box>
  );
};

export default NestedFolderManager;