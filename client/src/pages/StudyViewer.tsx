"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Divider,
  Avatar,
  Grid,
  Paper,
  IconButton,
  Tooltip,
  Badge,
  useTheme,
  alpha,
  useMediaQuery,
  Drawer,
  Fab,
  Tabs,
  Tab,
} from "@mui/material"
import {
  Assignment as ReportIcon,
  Receipt as BillingIcon,
  ArrowBack as BackIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  LocalHospital as HospitalIcon,
  Warning as WarningIcon,
  Star as StarIcon,
  Share as ShareIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  PriorityHigh as PriorityIcon,
  AutoAwesome as AIIcon,
  TrendingUp as TrendingIcon,
  Notifications as NotificationIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Psychology as PsychologyIcon,
  Speed as SpeedIcon,
  Assessment as AssessmentIcon,
  Group as GroupIcon,
  ViewInAr as ThreeDIcon,
  ViewModule as TwoDIcon,
  Dashboard as ComprehensiveIcon,
  Chat as ChatIcon,
  VideoCall as VideoCallIcon,
  PersonAdd as PersonAddIcon,
  Visibility as VisibilityIcon,
  Lock as LockIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

import { useParams } from "react-router-dom"

// Quarantined viewers - moved to quarantine folder
// import ProfessionalDicomViewer from "../components/DICOM/ProfessionalDicomViewer"
import SimpleDicomViewer from "../components/DICOM/SimpleDicomViewer"
import MultiFrameDicomViewer from "../components/DICOM/MultiFrameDicomViewer"
import ThreeDViewer from "../components/DICOM/ThreeDViewer"
import ComprehensiveDicomViewer from "../components/DICOM/ComprehensiveDicomViewer"
import OptimizedDicomViewer from "../components/DICOM/OptimizedDicomViewer"
import DicomPerformanceMonitor from "../components/DICOM/DicomPerformanceMonitor"
import CreateReportDialog from "../components/Report/CreateReportDialog"
import type { Study } from "../types"
import { apiService } from "../services/api"

const StudyViewer: React.FC = () => {
  const { studyUid } = useParams()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))
  const isTablet = useMediaQuery(theme.breakpoints.down("lg"))
  const [study, setStudy] = useState<Study | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isStarred, setIsStarred] = useState(false)
  const [urgentFindings, setUrgentFindings] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)
  const [useSimpleViewer, setUseSimpleViewer] = useState(true) // Start with simple viewer
  const [viewerTab, setViewerTab] = useState(0) // 0 = Simple, 1 = MultiFrame, 2 = 3D, 3 = Comprehensive, 4 = Optimized
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false)
  const [threeDSettings, setThreeDSettings] = useState({
    renderMode: 'volume' as 'volume' | 'mip' | 'surface' | 'raycast',
    opacity: 0.8,
    threshold: 0.1,
    windowWidth: 400,
    windowCenter: 40,
    colorMap: 'grayscale' as 'grayscale' | 'hot' | 'cool' | 'bone'
  })

  // Helper function to get DICOM URLs for 3D rendering
  const getDicomImageIds = (study: Study): string[] => {
    console.log('🔧 [StudyViewer] Getting DICOM URLs for study:', study.study_uid, 'Patient:', study.patient_id);
    
    const cleanUrls: string[] = [];
    
    // Extract clean HTTP URLs from the study's image_urls (remove wadouri: prefix if present)
    if (study.image_urls && Array.isArray(study.image_urls)) {
      study.image_urls.forEach(url => {
        let cleanUrl = url;
        if (url.startsWith('wadouri:')) {
          cleanUrl = url.replace('wadouri:', '');
        }
        if (cleanUrl.startsWith('http')) {
          cleanUrls.push(cleanUrl);
        }
      });
    }
    
    // Add fallback from dicom_url
    if (study.dicom_url) {
      let cleanUrl = study.dicom_url;
      if (!cleanUrl.startsWith('http')) {
        cleanUrl = `http://localhost:8000${cleanUrl}`;
      }
      if (!cleanUrls.includes(cleanUrl)) {
        cleanUrls.push(cleanUrl);
      }
    }
    
    // Add fallback from filename
    if (study.filename || study.original_filename) {
      const filename = study.filename || study.original_filename;
      const url = `http://localhost:8000/uploads/${study.patient_id}/${filename}`;
      if (!cleanUrls.includes(url)) {
        cleanUrls.push(url);
      }
    }
    
    console.log('🔧 [StudyViewer] Clean DICOM URLs for 3D:', cleanUrls);
    return cleanUrls;
  }


  useEffect(() => {
    console.log("🚀 StudyViewer component mounted with studyUid:", studyUid)

    const loadStudy = async () => {
      if (!studyUid) {
        setError("Study UID is required")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        console.log("🔍 [StudyViewer] Fetching study:", studyUid)
        const response = await apiService.getStudy(studyUid)
        console.log("📊 [StudyViewer] API response received:", response)
        console.log("🖼️ [StudyViewer] Study data:", response)
        console.log("🖼️ [StudyViewer] Image URLs:", response?.image_urls)
        console.log("🔍 [StudyViewer] Study structure:", {
          patient_id: response.patient_id,
          study_uid: response.study_uid,
          study_date: response.study_date,
          modality: response.modality,
          image_urls_count: response.image_urls?.length || 0,
          first_image_url: response.image_urls?.[0],
        })

        if (!response) {
          throw new Error("No study data received from server")
        }

        if (!response.patient_id) {
          throw new Error("Study data is missing patient_id")
        }

        // Ensure image_urls is an array
        if (!response.image_urls) {
          response.image_urls = []
        }

        console.log("✅ [StudyViewer] About to set study state")
        setStudy(response)
        console.log("✅ [StudyViewer] Study state set successfully")
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load study"
        setError(errorMessage)
        console.error("❌ [StudyViewer] Error loading study:", err)
      } finally {
        setLoading(false)
      }
    }

    loadStudy()
  }, [studyUid])

  const handleViewReport = (reportId: string) => {
    console.log("StudyViewer: Navigating to report with ID:", reportId)
    // In a real app, this would navigate to the report page
  }

  const handleCreateReport = () => {
    console.log("Create report for study:", studyUid)
    // TODO: Implement report creation
  }



  const handleViewBilling = () => {
    console.log("Viewing billing for study:", studyUid)
    // In a real app, this would navigate to billing page
  }

  const handleStarToggle = () => {
    setIsStarred(!isStarred)
  }

  const handleShare = () => {
    // Implement study sharing functionality
    console.log("Sharing study:", studyUid)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // Implement study download functionality
    console.log("Downloading study:", studyUid)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "received":
        return "info"
      case "processing":
        return "warning"
      case "completed":
        return "success"
      case "billed":
        return "secondary"
      case "error":
        return "error"
      default:
        return "default"
    }
  }

  const getPriorityLevel = (study: Study) => {
    // Determine priority based on study characteristics
    if (study.exam_type?.includes("emergency") || study.status === "error") {
      return "high"
    }
    if (study.modality === "CT" || study.modality === "MR") {
      return "medium"
    }
    return "normal"
  }

  const getPatientAge = (study: Study) => {
    // Calculate age from date of birth if available
    if (study.patient_info?.date_of_birth) {
      const birthDate = new Date(study.patient_info.date_of_birth)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      return age
    }
    return null
  }

  const getPatientGender = (study: Study) => {
    // Get gender from patient info
    return study.patient_info?.gender || "Unknown"
  }

  const getPatientName = (study: Study) => {
    // Get patient name from patient info
    return study.patient_info?.name || study.patient_id
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Button startIcon={<BackIcon />} onClick={() => console.log("Back to studies")} sx={{ mb: 2 }}>
          Back to Studies
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  if (!study) {
    return (
      <Box>
        <Button startIcon={<BackIcon />} onClick={() => console.log("Back to studies")} sx={{ mb: 2 }}>
          Back to Studies
        </Button>
        <Alert severity="warning">Study not found</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      display: "flex", 
      flexDirection: "column",
      bgcolor: "background.default",
      overflow: "hidden"
    }}>
      {/* Enhanced Professional Header */}
      <Paper
        sx={{
          p: isMobile ? 2 : 3,
          mb: 1,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          borderLeft: `4px solid ${getPriorityLevel(study) === "high" ? theme.palette.error.main : getPriorityLevel(study) === "medium" ? theme.palette.warning.main : theme.palette.success.main}`,
        }}
      >
        <Grid container spacing={isMobile ? 2 : 3} alignItems="center">
          {/* Patient & Study Info */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <Button
                startIcon={<BackIcon />}
                onClick={() => console.log("Back to studies")}
                variant="outlined"
                size="small"
                sx={{ minWidth: "auto" }}
              >
                Back
              </Button>

              <Avatar
                sx={{
                  bgcolor: theme.palette.primary.main,
                  width: 48,
                  height: 48,
                }}
              >
                <PersonIcon />
              </Avatar>

              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 700, color: "primary.main" }}>
                    {getPatientName(study)}
                  </Typography>
                  <Chip
                    size="small"
                    label={`${getPatientAge(study) ? `${getPatientAge(study)}Y` : ""} ${getPatientGender(study)}`}
                    sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: "info.main" }}
                  />
                  {getPriorityLevel(study) === "high" && (
                    <Tooltip title="High Priority Study">
                      <Badge color="error" variant="dot">
                        <PriorityIcon color="error" fontSize="small" />
                      </Badge>
                    </Tooltip>
                  )}
                  <Tooltip title={isStarred ? "Remove from favorites" : "Add to favorites"}>
                    <IconButton size="small" onClick={handleStarToggle}>
                      <StarIcon color={isStarred ? "warning" : "disabled"} fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography variant={isMobile ? "body1" : "subtitle1"} sx={{ fontWeight: 600, mb: 0.5 }}>
                  {study.study_description || study.exam_type}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Chip
                    icon={<HospitalIcon />}
                    label={study.modality}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    icon={<TimeIcon />}
                    label={study.study_date ? new Date(study.study_date).toLocaleDateString() : "No date"}
                    size="small"
                    variant="outlined"
                  />
                  <Chip label={study.status} size="small" color={getStatusColor(study.status) as any} />
                  {urgentFindings && (
                    <Chip
                      icon={<WarningIcon />}
                      label="Urgent Findings"
                      size="small"
                      color="error"
                      sx={{ animation: "pulse 2s infinite" }}
                    />
                  )}
                </Box>
              </Box>
            </Box>
          </Grid>

          {/* Quick Actions */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, flexWrap: "wrap" }}>
              {/* Primary Actions */}
              <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                {study.reports && study.reports.length > 0 ? (
                  <Button
                    startIcon={<ReportIcon />}
                    onClick={() => handleViewReport(study.reports![0].report_id)}
                    variant="contained"
                    size="medium"
                    sx={{ minWidth: 120 }}
                  >
                    View Report
                  </Button>
                ) : (
                  <Button
                    startIcon={<ReportIcon />}
                    onClick={handleCreateReport}
                    variant="contained"
                    size="medium"
                    sx={{ minWidth: 120 }}
                  >
                    Create Report
                  </Button>
                )}

                <Button startIcon={<BillingIcon />} onClick={handleViewBilling} variant="outlined" size="medium">
                  Billing
                </Button>

                <Button
                  onClick={() => setUseSimpleViewer(!useSimpleViewer)}
                  variant="outlined"
                  size="medium"
                  color={useSimpleViewer ? "primary" : "secondary"}
                >
                  {useSimpleViewer ? "Professional View" : "Simple View"}
                </Button>
              </Box>

              {/* Secondary Actions */}
              <Box sx={{ display: "flex", gap: 0.5 }}>
                <Tooltip title="Share Study">
                  <IconButton onClick={handleShare} size="small">
                    <ShareIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Print Study">
                  <IconButton onClick={handlePrint} size="small">
                    <PrintIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download Study">
                  <IconButton onClick={handleDownload} size="small">
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Contact Referring Physician">
                  <IconButton size="small">
                    <PhoneIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Send Results">
                  <IconButton size="small">
                    <EmailIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Comprehensive Study Metadata Panel */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: alpha(theme.palette.background.paper, 0.8) }}>
        <Grid container spacing={3}>
          {/* Patient Demographics & Clinical Info */}
          <Grid item xs={12} md={4}>
            <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ mb: 2, color: "primary.main", fontWeight: 600 }}>
              Patient Information
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                  Patient ID:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {study.patient_id}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                  Age/Gender:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {getPatientAge(study)}Y {getPatientGender(study)}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                  Referring Physician:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {"Not specified"}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                  Institution:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {"Main Hospital"}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                  Accession Number:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {"N/A"}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Study Details */}
          <Grid item xs={12} md={4}>
            <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ mb: 2, color: "primary.main", fontWeight: 600 }}>
              Study Details
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                  Study Date:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {study.study_date
                    ? new Date(study.study_date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                    : "Not available"}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                  Modality:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {study.modality}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                  Body Part:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {"Not specified"}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                  Series Count:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {"Unknown"}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                  Images Count:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {"Unknown"}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Clinical Context & History */}
          <Grid item xs={12} md={4}>
            <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ mb: 2, color: "primary.main", fontWeight: 600 }}>
              Clinical Context
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Clinical History:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    bgcolor: alpha(theme.palette.info.main, 0.05),
                    p: 1,
                    borderRadius: 1,
                    fontSize: "0.875rem",
                    lineHeight: 1.4,
                  }}
                >
                  {study.study_description || "No clinical history provided"}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Indication:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    bgcolor: alpha(theme.palette.warning.main, 0.05),
                    p: 1,
                    borderRadius: 1,
                    fontSize: "0.875rem",
                  }}
                >
                  {"Routine examination"}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                  Priority Level:
                </Typography>
                <Chip
                  label={getPriorityLevel(study).toUpperCase()}
                  size="small"
                  color={
                    getPriorityLevel(study) === "high"
                      ? "error"
                      : getPriorityLevel(study) === "medium"
                        ? "warning"
                        : "success"
                  }
                  sx={{ fontWeight: 600 }}
                />
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                  Prior Studies:
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  sx={{ minWidth: "auto", p: 0.5 }}
                  onClick={() => console.log("View prior studies")}
                >
                  View (3)
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Responsive Main Content Area */}
      <Box sx={{ 
        flexGrow: 1, 
        display: "flex", 
        flexDirection: { xs: "column", md: "row" },
        minHeight: 0,
        overflow: "hidden"
      }}>
        {/* DICOM Viewer with Tabs - Full Screen on Mobile, Left Side on Desktop */}
        <Box
          sx={{
            flex: 1,
            minHeight: { xs: "60vh", md: "calc(100vh - 120px)" },
            maxHeight: { xs: "60vh", md: "calc(100vh - 120px)" },
            overflow: "hidden",
            order: { xs: 1, md: 0 },
            display: "flex",
            flexDirection: "column"
          }}
        >
          {study ? (
            <>
              {/* Viewer Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Tabs 
                  value={viewerTab} 
                  onChange={(_, newValue) => setViewerTab(newValue)}
                  variant="fullWidth"
                  sx={{ minHeight: 48 }}
                >
                  <Tab 
                    icon={<TwoDIcon />} 
                    label="2D Viewer" 
                    sx={{ minHeight: 48, fontSize: '0.875rem' }}
                  />
                  <Tab 
                    icon={<ThreeDIcon />} 
                    label="3D Volume" 
                    sx={{ minHeight: 48, fontSize: '0.875rem' }}
                  />
                  <Tab 
                    icon={<ComprehensiveIcon />} 
                    label="Comprehensive" 
                    sx={{ minHeight: 48, fontSize: '0.875rem' }}
                  />
                  <Tab 
                    icon={<SpeedIcon />} 
                    label="Optimized" 
                    sx={{ minHeight: 48, fontSize: '0.875rem' }}
                  />
                </Tabs>
              </Box>

              {/* Viewer Content */}
              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                {viewerTab === 0 ? (
                  <SimpleDicomViewer
                    study={study}
                    onError={(error) => {
                      console.error("Simple DICOM Viewer Error:", error)
                      setError(`Simple DICOM Viewer Error: ${error}`)
                    }}
                  />
                ) : viewerTab === 1 ? (
                  <MultiFrameDicomViewer
                    study={study}
                    onError={(error) => {
                      console.error("MultiFrame DICOM Viewer Error:", error)
                      setError(`MultiFrame DICOM Viewer Error: ${error}`)
                    }}
                  />
                ) : viewerTab === 2 ? (
                  <Box sx={{ height: '100%', position: 'relative' }}>
                    <ThreeDViewer
                      study={study}
                      imageIds={getDicomImageIds(study)}
                      settings={threeDSettings}
                      onSettingsChange={setThreeDSettings}
                    />
                    {/* Debug info for development */}
                    {process.env.NODE_ENV === 'development' && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          bgcolor: 'rgba(0,0,0,0.7)',
                          color: 'white',
                          p: 1,
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          maxWidth: 300,
                          zIndex: 1000
                        }}
                      >
                        <Typography variant="caption" display="block">
                          Study: {study.study_uid}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Patient: {study.patient_id}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Available URLs: {getDicomImageIds(study).length}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ fontSize: '0.6rem', opacity: 0.8 }}>
                          URLs: {getDicomImageIds(study).slice(0, 2).map(url => url.split('/').pop()).join(', ')}
                          {getDicomImageIds(study).length > 2 && '...'}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                ) : viewerTab === 2 ? (
                  <ComprehensiveDicomViewer
                    study={study}
                    onError={(error) => {
                      console.error("Comprehensive DICOM Viewer Error:", error)
                      setError(`Comprehensive DICOM Viewer Error: ${error}`)
                    }}
                  />
                ) : (
                  <OptimizedDicomViewer
                    study={study}
                    onError={(error) => {
                      console.error("Optimized DICOM Viewer Error:", error)
                      setError(`Optimized DICOM Viewer Error: ${error}`)
                    }}
                  />
                )}
              </Box>
            </>
          ) : (
            <Box
              sx={{
                p: 3,
                textAlign: "center",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "background.paper"
              }}
            >
              <Typography variant="h6" color="text.secondary">
                {loading ? "Loading study data..." : "No study data available"}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Study Information Panel - Responsive */}
        <Box
          sx={{
            width: { xs: "100%", md: 320, lg: 360 },
            minHeight: { xs: "40vh", md: "calc(100vh - 120px)" },
            maxHeight: { xs: "40vh", md: "calc(100vh - 120px)" },
            overflow: "auto",
            bgcolor: "background.paper",
            borderLeft: { md: 1 },
            borderTop: { xs: 1, md: 0 },
            borderColor: "divider",
            order: { xs: 2, md: 1 }
          }}
        >
          <Box sx={{ 
            p: { xs: 2, sm: 3 }, 
            height: "100%",
            display: "flex",
            flexDirection: "column"
          }}>
            {/* Header */}
            <Box sx={{ 
              pb: 2, 
              borderBottom: 1, 
              borderColor: "divider",
              mb: 2,
              flexShrink: 0
            }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                📊 Study Information
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Patient and study details
              </Typography>
            </Box>

            {/* Scrollable Content */}
            <Box sx={{ 
              flex: 1, 
              overflow: "auto",
              pr: 1,
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'rgba(0,0,0,0.1)',
                borderRadius: '3px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '3px',
                '&:hover': {
                  background: 'rgba(0,0,0,0.5)',
                },
              },
            }}>

              {/* Patient Information Card */}
              <Card sx={{ 
                mb: 2, 
                boxShadow: 1,
                '&:hover': { boxShadow: 2 },
                transition: 'box-shadow 0.2s'
              }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <PersonIcon sx={{ mr: 1, color: "primary.main" }} />
                    <Typography variant="subtitle1" fontWeight={600}>
                      Patient Information
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={1}>
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Name:</strong> {study.patient_info?.name || study.patient_id || "Unknown"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>ID:</strong> {study.patient_id || "N/A"}
                      </Typography>
                    </Grid>
                    {study.patient_info?.date_of_birth && (
                      <Grid item xs={12}>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>DOB:</strong> {new Date(study.patient_info.date_of_birth).toLocaleDateString()}
                        </Typography>
                      </Grid>
                    )}
                    {study.patient_info?.date_of_birth && (
                      <Grid item xs={6}>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Age:</strong> {getPatientAge(study)} years
                        </Typography>
                      </Grid>
                    )}
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Gender:</strong> {study.patient_info?.gender || "Unknown"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Study Date:</strong>{" "}
                        {study.study_date ? new Date(study.study_date).toLocaleDateString() : "N/A"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="body2">
                          <strong>Modality:</strong>
                        </Typography>
                        <Chip 
                          label={study.modality || "N/A"} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Study Details Card */}
              <Card sx={{ 
                mb: 2, 
                boxShadow: 1,
                '&:hover': { boxShadow: 2 },
                transition: 'box-shadow 0.2s'
              }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <HospitalIcon sx={{ mr: 1, color: "primary.main" }} />
                    <Typography variant="subtitle1" fontWeight={600}>
                      Study Details
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={1}>
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Study UID:</strong>
                      </Typography>
                      <Paper sx={{ 
                        p: 1, 
                        bgcolor: "grey.50", 
                        mb: 2,
                        border: 1,
                        borderColor: "grey.200"
                      }}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            wordBreak: "break-all", 
                            fontFamily: "monospace",
                            fontSize: "0.7rem"
                          }}
                        >
                          {study.study_uid}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Exam Type:</strong> {study.exam_type || "N/A"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Description:</strong> {study.description || study.study_description || "N/A"}
                      </Typography>
                    </Grid>
                    {study.study_time && (
                      <Grid item xs={12}>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Study Time:</strong> {study.study_time}
                        </Typography>
                      </Grid>
                    )}
                    {study.workflow_status && (
                      <Grid item xs={12}>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Workflow Status:</strong> {study.workflow_status}
                        </Typography>
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                        <Typography variant="body2">
                          <strong>Status:</strong>
                        </Typography>
                        <Chip 
                          label={study.status} 
                          size="small" 
                          color={getStatusColor(study.status) as any}
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

            {/* Study Statistics Section */}
            {study.study_statistics && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Study Statistics
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Total Files:</strong> {study.study_statistics.total_files || "N/A"}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Total Size:</strong>{" "}
                    {study.study_statistics.total_size_mb ? `${study.study_statistics.total_size_mb} MB` : "N/A"}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Series Count:</strong> {study.study_statistics.series_count || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Instance Count:</strong> {study.study_statistics.instance_count || "N/A"}
                  </Typography>
                </CardContent>
              </Card>
            )}

              {/* Quick Actions Card */}
              <Card sx={{ 
                mb: 2, 
                boxShadow: 1,
                '&:hover': { boxShadow: 2 },
                transition: 'box-shadow 0.2s'
              }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <AssessmentIcon sx={{ mr: 1, color: "primary.main" }} />
                    <Typography variant="subtitle1" fontWeight={600}>
                      Quick Actions
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={1}>
                    <Grid item xs={12}>
                      <Button 
                        variant="contained" 
                        fullWidth 
                        startIcon={<ReportIcon />}
                        onClick={handleCreateReport}
                        sx={{ mb: 1 }}
                      >
                        Create Report
                      </Button>
                    </Grid>
                    <Grid item xs={12}>
                      <Button 
                        variant="outlined" 
                        fullWidth 
                        startIcon={<BillingIcon />}
                        sx={{ mb: 1 }}
                      >
                        Generate Bill
                      </Button>
                    </Grid>
                    <Grid item xs={6}>
                      <Button 
                        variant="outlined" 
                        fullWidth 
                        startIcon={<ShareIcon />}
                        size="small"
                      >
                        Share
                      </Button>
                    </Grid>
                    <Grid item xs={6}>
                      <Button 
                        variant="outlined" 
                        fullWidth 
                        startIcon={<PrintIcon />}
                        size="small"
                      >
                        Print
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Performance Monitor Card */}
              <Card sx={{ 
                mb: 2, 
                boxShadow: 1,
                '&:hover': { boxShadow: 2 },
                transition: 'box-shadow 0.2s'
              }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <SpeedIcon sx={{ mr: 1, color: "primary.main" }} />
                      <Typography variant="subtitle1" fontWeight={600}>
                        Performance Monitor
                      </Typography>
                    </Box>
                    <Button 
                      size="small"
                      variant={showPerformanceMonitor ? "contained" : "outlined"}
                      onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
                    >
                      {showPerformanceMonitor ? "Hide" : "Show"}
                    </Button>
                  </Box>
                  
                  {showPerformanceMonitor && (
                    <DicomPerformanceMonitor />
                  )}
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default StudyViewer;
