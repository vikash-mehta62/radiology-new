/**
 * Study Browser Component
 * Provides comprehensive DICOM study and series navigation for the Unified DICOM Viewer
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Collapse,
  IconButton,
  Tooltip,
  Chip,
  Badge,
  Stack,
  Divider,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Button,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  CardActions,
  Avatar,
  useTheme,
  alpha
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Folder,
  FolderOpen,
  Image,
  VideoLibrary,
  ThreeDRotation,
  Search,
  FilterList,
  Sort,
  Refresh,
  Download,
  Share,
  Info,
  Warning,
  Error,
  CheckCircle,
  Schedule,
  Person,
  LocalHospital,
  CalendarToday,
  AccessTime,
  Visibility,
  VisibilityOff,
  Star,
  StarBorder,
  Label,
  PlayArrow,
  Pause,
  Stop
} from '@mui/icons-material';

// DICOM data interfaces
export interface DicomStudy {
  studyInstanceUID: string;
  studyDate: string;
  studyTime: string;
  studyDescription: string;
  patientName: string;
  patientID: string;
  patientBirthDate: string;
  patientSex: string;
  accessionNumber: string;
  modality: string;
  numberOfSeries: number;
  numberOfInstances: number;
  series: DicomSeries[];
  isLoading?: boolean;
  isExpanded?: boolean;
  isFavorite?: boolean;
  status?: 'available' | 'loading' | 'error' | 'partial';
  metadata?: any;
}

export interface DicomSeries {
  seriesInstanceUID: string;
  seriesNumber: string;
  seriesDescription: string;
  modality: string;
  numberOfInstances: number;
  bodyPartExamined: string;
  seriesDate: string;
  seriesTime: string;
  imageIds: string[];
  thumbnailUrl?: string;
  isSelected?: boolean;
  isLoading?: boolean;
  isMultiframe?: boolean;
  frameCount?: number;
  orientation?: 'axial' | 'sagittal' | 'coronal' | 'oblique';
  pixelSpacing?: [number, number];
  sliceThickness?: number;
  metadata?: any;
}

export interface StudyBrowserProps {
  // Data
  studies: DicomStudy[];
  selectedStudyUID?: string;
  selectedSeriesUIDs: string[];
  
  // Loading states
  isLoading?: boolean;
  loadingProgress?: number;
  
  // Callbacks
  onStudySelect: (studyUID: string) => void;
  onSeriesSelect: (seriesUIDs: string[]) => void;
  onSeriesLoad: (seriesUID: string) => void;
  onStudyRefresh: (studyUID: string) => void;
  onStudyDownload: (studyUID: string) => void;
  onStudyShare: (studyUID: string) => void;
  onStudyFavorite: (studyUID: string, favorite: boolean) => void;
  
  // Configuration
  enableMultiSelect?: boolean;
  enableThumbnails?: boolean;
  enableFavorites?: boolean;
  enableDownload?: boolean;
  enableShare?: boolean;
  showPatientInfo?: boolean;
  showSeriesDetails?: boolean;
  compactMode?: boolean;
  
  // Filtering and sorting
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  sortBy?: 'date' | 'name' | 'modality' | 'series';
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sortBy: string, sortOrder: string) => void;
  filterModality?: string;
  onFilterChange?: (modality: string) => void;
  
  // Styling
  maxHeight?: number;
  showHeader?: boolean;
}

// Modality icons mapping
const MODALITY_ICONS = {
  CT: ThreeDRotation,
  MR: ThreeDRotation,
  US: VideoLibrary,
  XA: VideoLibrary,
  RF: VideoLibrary,
  CR: Image,
  DX: Image,
  MG: Image,
  PT: ThreeDRotation,
  NM: ThreeDRotation,
  SC: Image,
  OT: Image
};

// Modality colors
const MODALITY_COLORS = {
  CT: '#2196F3',
  MR: '#9C27B0',
  US: '#FF9800',
  XA: '#F44336',
  RF: '#E91E63',
  CR: '#4CAF50',
  DX: '#8BC34A',
  MG: '#FF5722',
  PT: '#673AB7',
  NM: '#3F51B5',
  SC: '#607D8B',
  OT: '#795548'
};

export const StudyBrowser: React.FC<StudyBrowserProps> = ({
  studies,
  selectedStudyUID,
  selectedSeriesUIDs,
  isLoading = false,
  loadingProgress = 0,
  onStudySelect,
  onSeriesSelect,
  onSeriesLoad,
  onStudyRefresh,
  onStudyDownload,
  onStudyShare,
  onStudyFavorite,
  enableMultiSelect = true,
  enableThumbnails = true,
  enableFavorites = true,
  enableDownload = true,
  enableShare = true,
  showPatientInfo = true,
  showSeriesDetails = true,
  compactMode = false,
  searchQuery = '',
  onSearchChange,
  sortBy = 'date',
  sortOrder = 'desc',
  onSortChange,
  filterModality = '',
  onFilterChange,
  maxHeight = 600,
  showHeader = true
}) => {
  const theme = useTheme();
  const [expandedStudies, setExpandedStudies] = useState<Set<string>>(new Set());
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [showFilters, setShowFilters] = useState(false);
  
  // Handle study expansion
  const handleStudyExpand = useCallback((studyUID: string) => {
    setExpandedStudies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studyUID)) {
        newSet.delete(studyUID);
      } else {
        newSet.add(studyUID);
      }
      return newSet;
    });
  }, []);
  
  // Handle study selection
  const handleStudySelect = useCallback((studyUID: string) => {
    onStudySelect(studyUID);
    if (!expandedStudies.has(studyUID)) {
      handleStudyExpand(studyUID);
    }
  }, [onStudySelect, expandedStudies, handleStudyExpand]);
  
  // Handle series selection
  const handleSeriesSelect = useCallback((seriesUID: string, multiSelect: boolean = false) => {
    if (enableMultiSelect && multiSelect) {
      const newSelection = selectedSeriesUIDs.includes(seriesUID)
        ? selectedSeriesUIDs.filter(uid => uid !== seriesUID)
        : [...selectedSeriesUIDs, seriesUID];
      onSeriesSelect(newSelection);
    } else {
      onSeriesSelect([seriesUID]);
    }
  }, [enableMultiSelect, selectedSeriesUIDs, onSeriesSelect]);
  
  // Handle search
  const handleSearchChange = useCallback((query: string) => {
    setLocalSearchQuery(query);
    onSearchChange?.(query);
  }, [onSearchChange]);
  
  // Filter and sort studies
  const filteredAndSortedStudies = useMemo(() => {
    let filtered = studies;
    
    // Apply search filter
    if (localSearchQuery) {
      const query = localSearchQuery.toLowerCase();
      filtered = filtered.filter(study =>
        study.patientName.toLowerCase().includes(query) ||
        study.patientID.toLowerCase().includes(query) ||
        study.studyDescription.toLowerCase().includes(query) ||
        study.accessionNumber.toLowerCase().includes(query) ||
        study.modality.toLowerCase().includes(query)
      );
    }
    
    // Apply modality filter
    if (filterModality) {
      filtered = filtered.filter(study => study.modality === filterModality);
    }
    
    // Sort studies
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.studyDate).getTime() - new Date(b.studyDate).getTime();
          break;
        case 'name':
          comparison = a.patientName.localeCompare(b.patientName);
          break;
        case 'modality':
          comparison = a.modality.localeCompare(b.modality);
          break;
        case 'series':
          comparison = a.numberOfSeries - b.numberOfSeries;
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return filtered;
  }, [studies, localSearchQuery, filterModality, sortBy, sortOrder]);
  
  // Get unique modalities for filter
  const availableModalities = useMemo(() => {
    const modalities = new Set(studies.map(study => study.modality));
    return Array.from(modalities).sort();
  }, [studies]);
  
  // Render study item
  const renderStudyItem = useCallback((study: DicomStudy) => {
    const isExpanded = expandedStudies.has(study.studyInstanceUID);
    const isSelected = selectedStudyUID === study.studyInstanceUID;
    const ModalityIcon = MODALITY_ICONS[study.modality as keyof typeof MODALITY_ICONS] || Image;
    const modalityColor = MODALITY_COLORS[study.modality as keyof typeof MODALITY_COLORS] || theme.palette.grey[500];
    
    return (
      <Box key={study.studyInstanceUID}>
        <ListItem
          disablePadding
          sx={{
            backgroundColor: isSelected ? alpha(theme.palette.primary.main, 0.1) : 'transparent'
          }}
        >
          <ListItemButton
            onClick={() => handleStudySelect(study.studyInstanceUID)}
            sx={{ pl: compactMode ? 1 : 2 }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  backgroundColor: modalityColor,
                  fontSize: '0.875rem'
                }}
              >
                {study.modality}
              </Avatar>
            </ListItemIcon>
            
            <ListItemText
              primary={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="subtitle2" noWrap>
                    {study.patientName}
                  </Typography>
                  
                  {study.isFavorite && enableFavorites && (
                    <Star fontSize="small" color="warning" />
                  )}
                  
                  <Chip
                    label={`${study.numberOfSeries} series`}
                    size="small"
                    variant="outlined"
                    sx={{ height: 20 }}
                  />
                  
                  {study.status === 'loading' && (
                    <Chip
                      label="Loading"
                      size="small"
                      color="info"
                      sx={{ height: 20 }}
                    />
                  )}
                  
                  {study.status === 'error' && (
                    <Chip
                      label="Error"
                      size="small"
                      color="error"
                      sx={{ height: 20 }}
                    />
                  )}
                </Stack>
              }
              secondary={
                showPatientInfo && !compactMode ? (
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      ID: {study.patientID} • {study.studyDate} • {study.studyDescription}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Accession: {study.accessionNumber}
                    </Typography>
                  </Stack>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    {study.studyDate} • {study.studyDescription}
                  </Typography>
                )
              }
            />
            
            <ListItemSecondaryAction>
              <Stack direction="row" spacing={0.5}>
                {enableFavorites && (
                  <Tooltip title={study.isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStudyFavorite(study.studyInstanceUID, !study.isFavorite);
                      }}
                    >
                      {study.isFavorite ? <Star color="warning" /> : <StarBorder />}
                    </IconButton>
                  </Tooltip>
                )}
                
                <Tooltip title="Refresh study">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStudyRefresh(study.studyInstanceUID);
                    }}
                  >
                    <Refresh />
                  </IconButton>
                </Tooltip>
                
                {enableDownload && (
                  <Tooltip title="Download study">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStudyDownload(study.studyInstanceUID);
                      }}
                    >
                      <Download />
                    </IconButton>
                  </Tooltip>
                )}
                
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStudyExpand(study.studyInstanceUID);
                  }}
                >
                  {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Stack>
            </ListItemSecondaryAction>
          </ListItemButton>
        </ListItem>
        
        {/* Series list */}
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {study.series.map((series) => renderSeriesItem(series, study.studyInstanceUID))}
          </List>
        </Collapse>
        
        <Divider />
      </Box>
    );
  }, [
    expandedStudies,
    selectedStudyUID,
    compactMode,
    showPatientInfo,
    enableFavorites,
    enableDownload,
    handleStudySelect,
    handleStudyExpand,
    onStudyFavorite,
    onStudyRefresh,
    onStudyDownload,
    theme
  ]);
  
  // Render series item
  const renderSeriesItem = useCallback((series: DicomSeries, studyUID: string) => {
    const isSelected = selectedSeriesUIDs.includes(series.seriesInstanceUID);
    const ModalityIcon = MODALITY_ICONS[series.modality as keyof typeof MODALITY_ICONS] || Image;
    
    return (
      <ListItem
        key={series.seriesInstanceUID}
        disablePadding
        sx={{
          backgroundColor: isSelected ? alpha(theme.palette.primary.main, 0.1) : 'transparent'
        }}
      >
        <ListItemButton
          sx={{ pl: compactMode ? 3 : 4 }}
          onClick={(e) => handleSeriesSelect(series.seriesInstanceUID, e.ctrlKey || e.metaKey)}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <ModalityIcon fontSize="small" />
          </ListItemIcon>
          
          <ListItemText
            primary={
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" noWrap>
                  Series {series.seriesNumber}: {series.seriesDescription || 'Unnamed Series'}
                </Typography>
                
                <Chip
                  label={series.modality}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.7rem',
                    backgroundColor: MODALITY_COLORS[series.modality as keyof typeof MODALITY_COLORS] || theme.palette.grey[300],
                    color: 'white'
                  }}
                />
                
                {series.isMultiframe && (
                  <Chip
                    label="Multi-frame"
                    size="small"
                    variant="outlined"
                    sx={{ height: 18, fontSize: '0.7rem' }}
                  />
                )}
              </Stack>
            }
            secondary={
              showSeriesDetails && !compactMode ? (
                <Typography variant="caption" color="text.secondary">
                  {series.numberOfInstances} images • {series.bodyPartExamined}
                  {series.pixelSpacing && ` • ${series.pixelSpacing[0].toFixed(2)}mm spacing`}
                </Typography>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  {series.numberOfInstances} images
                </Typography>
              )
            }
          />
          
          <ListItemSecondaryAction>
            <Stack direction="row" spacing={0.5}>
              {enableMultiSelect && (
                <Checkbox
                  edge="end"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleSeriesSelect(series.seriesInstanceUID, true);
                  }}
                  size="small"
                />
              )}
              
              <Tooltip title="Load series">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeriesLoad(series.seriesInstanceUID);
                  }}
                >
                  <PlayArrow />
                </IconButton>
              </Tooltip>
            </Stack>
          </ListItemSecondaryAction>
        </ListItemButton>
      </ListItem>
    );
  }, [
    selectedSeriesUIDs,
    compactMode,
    showSeriesDetails,
    enableMultiSelect,
    handleSeriesSelect,
    onSeriesLoad,
    theme
  ]);
  
  return (
    <Paper
      elevation={1}
      sx={{
        height: maxHeight,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      {showHeader && (
        <Box
          sx={{
            p: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            backgroundColor: 'background.paper'
          }}
        >
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">
                Study Browser
              </Typography>
              
              <Stack direction="row" spacing={1}>
                <Tooltip title="Toggle filters">
                  <IconButton
                    size="small"
                    color={showFilters ? 'primary' : 'default'}
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <FilterList />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Refresh all">
                  <IconButton size="small">
                    <Refresh />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
            
            {/* Search */}
            <TextField
              size="small"
              placeholder="Search studies..."
              value={localSearchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                )
              }}
            />
            
            {/* Filters */}
            <Collapse in={showFilters}>
              <Stack direction="row" spacing={2}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Sort by</InputLabel>
                  <Select
                    value={sortBy}
                    label="Sort by"
                    onChange={(e) => onSortChange?.(e.target.value, sortOrder)}
                  >
                    <MenuItem value="date">Date</MenuItem>
                    <MenuItem value="name">Patient Name</MenuItem>
                    <MenuItem value="modality">Modality</MenuItem>
                    <MenuItem value="series">Series Count</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel>Order</InputLabel>
                  <Select
                    value={sortOrder}
                    label="Order"
                    onChange={(e) => onSortChange?.(sortBy, e.target.value)}
                  >
                    <MenuItem value="asc">Ascending</MenuItem>
                    <MenuItem value="desc">Descending</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Modality</InputLabel>
                  <Select
                    value={filterModality}
                    label="Modality"
                    onChange={(e) => onFilterChange?.(e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    {availableModalities.map(modality => (
                      <MenuItem key={modality} value={modality}>
                        {modality}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Collapse>
          </Stack>
        </Box>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <LinearProgress
          variant={loadingProgress > 0 ? 'determinate' : 'indeterminate'}
          value={loadingProgress}
        />
      )}
      
      {/* Study list */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {filteredAndSortedStudies.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              p: 4
            }}
          >
            <Stack alignItems="center" spacing={2}>
              <Folder sx={{ fontSize: 48, opacity: 0.5 }} />
              <Typography variant="body2" color="text.secondary">
                {localSearchQuery ? 'No studies match your search' : 'No studies available'}
              </Typography>
            </Stack>
          </Box>
        ) : (
          <List>
            {filteredAndSortedStudies.map(renderStudyItem)}
          </List>
        )}
      </Box>
      
      {/* Footer */}
      <Box
        sx={{
          p: 1,
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: 'background.paper'
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary">
            {filteredAndSortedStudies.length} studies
            {selectedSeriesUIDs.length > 0 && ` • ${selectedSeriesUIDs.length} series selected`}
          </Typography>
          
          {selectedSeriesUIDs.length > 0 && (
            <Button
              size="small"
              variant="contained"
              onClick={() => selectedSeriesUIDs.forEach(onSeriesLoad)}
            >
              Load Selected
            </Button>
          )}
        </Stack>
      </Box>
    </Paper>
  );
};

export default StudyBrowser;