import React, { useState, useEffect } from 'react';
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
  Chip,
  Menu,
  MenuItem,
  Breadcrumbs,
  Link,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  InsertDriveFile as FileIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  CreateNewFolder as CreateFolderIcon,
  NavigateNext as NavigateNextIcon,
  Home as HomeIcon,
  Image as ImageIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';

interface FolderItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  parent_id?: string;
  size?: number;
  file_type?: string;
  created_at: string;
  updated_at?: string;
  created_by: string;
  study_count?: number;
  file_count?: number;
  shared?: boolean;
  permissions?: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
}

const FolderManager: React.FC = () => {
  const [items, setItems] = useState<FolderItem[]>([]);
  const [currentPath, setCurrentPath] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<FolderItem | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuItem, setMenuItem] = useState<FolderItem | null>(null);

  // Mock data for development
  useEffect(() => {
    const mockItems: FolderItem[] = [
      {
        id: '1',
        name: 'Patient Studies',
        type: 'folder',
        created_at: '2024-01-15T10:30:00Z',
        created_by: 'admin',
        study_count: 25,
        file_count: 150,
        permissions: { read: true, write: true, delete: true }
      },
      {
        id: '2',
        name: 'Templates',
        type: 'folder',
        created_at: '2024-01-20T14:20:00Z',
        created_by: 'admin',
        file_count: 12,
        permissions: { read: true, write: true, delete: false }
      },
      {
        id: '3',
        name: 'Reports Archive',
        type: 'folder',
        created_at: '2024-02-01T09:15:00Z',
        created_by: 'radiologist1',
        file_count: 89,
        shared: true,
        permissions: { read: true, write: false, delete: false }
      },
      {
        id: '4',
        name: 'System Backups',
        type: 'folder',
        created_at: '2024-01-10T16:45:00Z',
        created_by: 'system',
        file_count: 5,
        permissions: { read: true, write: false, delete: false }
      },
      {
        id: '5',
        name: 'CT Protocol Guidelines.pdf',
        type: 'file',
        file_type: 'pdf',
        size: 2048576, // 2MB
        created_at: '2024-02-15T11:30:00Z',
        created_by: 'radiologist2',
        permissions: { read: true, write: true, delete: true }
      },
      {
        id: '6',
        name: 'MRI Safety Checklist.docx',
        type: 'file',
        file_type: 'docx',
        size: 524288, // 512KB
        created_at: '2024-02-10T13:45:00Z',
        created_by: 'technologist1',
        shared: true,
        permissions: { read: true, write: false, delete: false }
      }
    ];

    setTimeout(() => {
      setItems(mockItems);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.created_by.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleItemClick = (item: FolderItem) => {
    if (item.type === 'folder') {
      // Navigate into folder
      setCurrentPath([...currentPath, item]);
      // In a real app, you would load the folder contents here
    } else {
      // Handle file click (preview, download, etc.)
      console.log('File clicked:', item.name);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      // Root folder
      setCurrentPath([]);
    } else {
      // Navigate to specific folder in path
      setCurrentPath(currentPath.slice(0, index + 1));
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, item: FolderItem) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setMenuItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuItem(null);
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      const newFolder: FolderItem = {
        id: Date.now().toString(),
        name: newFolderName.trim(),
        type: 'folder',
        parent_id: currentPath.length > 0 ? currentPath[currentPath.length - 1].id : undefined,
        created_at: new Date().toISOString(),
        created_by: 'current_user',
        file_count: 0,
        permissions: { read: true, write: true, delete: true }
      };
      
      setItems([...items, newFolder]);
      setNewFolderName('');
      setShowCreateDialog(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const getFileIcon = (item: FolderItem) => {
    if (item.type === 'folder') {
      return <FolderIcon color="primary" />;
    }
    
    switch (item.file_type) {
      case 'pdf':
        return <DocumentIcon color="error" />;
      case 'docx':
      case 'doc':
        return <DocumentIcon color="info" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <ImageIcon color="success" />;
      default:
        return <FileIcon color="action" />;
    }
  };

  const getCurrentFolderName = (): string => {
    if (currentPath.length === 0) return 'Root';
    return currentPath[currentPath.length - 1].name;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Folder Manager
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setShowUploadDialog(true)}
          >
            Upload
          </Button>
          <Button
            variant="contained"
            startIcon={<CreateFolderIcon />}
            onClick={() => setShowCreateDialog(true)}
          >
            New Folder
          </Button>
        </Box>
      </Box>

      {/* Breadcrumb Navigation */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            aria-label="folder breadcrumb"
          >
            <Link
              component="button"
              variant="body1"
              onClick={() => handleBreadcrumbClick(-1)}
              sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
            >
              <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
              Root
            </Link>
            {currentPath.map((folder, index) => (
              <Link
                key={folder.id}
                component="button"
                variant="body1"
                onClick={() => handleBreadcrumbClick(index)}
                sx={{ textDecoration: 'none' }}
              >
                {folder.name}
              </Link>
            ))}
          </Breadcrumbs>
        </CardContent>
      </Card>

      {/* Search and Current Folder Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search files and folders..."
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
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <Chip
                  label={`${filteredItems.filter(i => i.type === 'folder').length} folders`}
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label={`${filteredItems.filter(i => i.type === 'file').length} files`}
                  color="secondary"
                  variant="outlined"
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* File/Folder List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {getCurrentFolderName()}
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {filteredItems.map((item, index) => (
                <React.Fragment key={item.id}>
                  <ListItem
                    button
                    onClick={() => handleItemClick(item)}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemIcon>
                      {getFileIcon(item)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1">
                            {item.name}
                          </Typography>
                          {item.shared && (
                            <Chip
                              label="Shared"
                              size="small"
                              color="info"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Created by {item.created_by} on {formatDate(item.created_at)}
                          </Typography>
                          {item.type === 'folder' && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                              {item.study_count ? `${item.study_count} studies, ` : ''}
                              {item.file_count || 0} files
                            </Typography>
                          )}
                          {item.type === 'file' && item.size && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                              {formatFileSize(item.size)}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={(e) => handleMenuClick(e, item)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < filteredItems.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}

          {!loading && filteredItems.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <FolderOpenIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No items found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchTerm ? 'Try adjusting your search criteria' : 'This folder is empty'}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <ShareIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Share</ListItemText>
        </MenuItem>
        {menuItem?.type === 'file' && (
          <MenuItem onClick={handleMenuClose}>
            <ListItemIcon>
              <DownloadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Download</ListItemText>
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={handleMenuClose} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create Folder Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Create New Folder
        </DialogTitle>
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
                handleCreateFolder();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateFolder}
            variant="contained"
            disabled={!newFolderName.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog
        open={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Upload Files
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            File upload functionality will be implemented here.
          </Alert>
          <Box
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 1,
              p: 4,
              textAlign: 'center',
              backgroundColor: 'action.hover',
            }}
          >
            <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Drag and drop files here
            </Typography>
            <Typography variant="body2" color="text.secondary">
              or click to browse
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUploadDialog(false)}>
            Cancel
          </Button>
          <Button variant="contained">
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FolderManager;