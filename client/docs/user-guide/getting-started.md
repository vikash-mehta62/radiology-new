# Getting Started

This guide will help you get up and running with the Multi-Slice DICOM Viewer quickly and efficiently.

## First Time Setup

### 1. System Check
Before using the viewer, ensure your system meets the requirements:

```javascript
// The viewer will automatically check your system capabilities
// Look for the system status indicator in the top-right corner:
// 🟢 Green: Optimal performance
// 🟡 Yellow: Good performance with some limitations
// 🔴 Red: Basic functionality only
```

### 2. Browser Configuration
For optimal performance, configure your browser:

#### Chrome/Edge
1. Enable hardware acceleration: `Settings > Advanced > System > Use hardware acceleration`
2. Allow sufficient memory: `Settings > Advanced > System > Memory`
3. Enable WebGL: Visit `chrome://flags` and ensure WebGL is enabled

#### Firefox
1. Enable hardware acceleration: `Settings > General > Performance`
2. Enable WebGL: Visit `about:config` and set `webgl.force-enabled` to `true`

### 3. Display Calibration
Proper display calibration is crucial for medical imaging:

1. **Monitor Settings**
   - Set brightness to 100-120 cd/m²
   - Ensure gamma is set to 2.2
   - Use a calibrated medical-grade monitor when possible

2. **Room Lighting**
   - Minimize ambient light
   - Use consistent lighting conditions
   - Avoid reflections on the screen

## Loading Your First Study

### Method 1: File Upload
1. Click the **"Load Study"** button in the main interface
2. Select your DICOM files (supports .dcm, .dicom formats)
3. Wait for processing to complete
4. The viewer will automatically detect multi-slice studies

### Method 2: Drag and Drop
1. Simply drag DICOM files from your file explorer
2. Drop them onto the viewer interface
3. The system will automatically process and load the study

### Method 3: URL Loading
1. Click **"Load from URL"**
2. Enter the DICOM file URL or WADO-URI
3. Click **"Load"** to fetch and display the study

## Understanding the Interface

### Main Components

```
┌─────────────────────────────────────────────────────────────┐
│ [Menu] [Tools] [View] [AI] [Collaborate]    [Help] [Settings]│
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────────────────────────┐ │
│ │                 │ │                                     │ │
│ │   Tool Panel    │ │         Main Viewer Area           │ │
│ │                 │ │                                     │ │
│ │  • Measurements │ │                                     │ │
│ │  • Annotations  │ │                                     │ │
│ │  • AI Tools     │ │                                     │ │
│ │  • Adjustments  │ │                                     │ │
│ │                 │ │                                     │ │
│ └─────────────────┘ └─────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Slice: 1/150 | Zoom: 100% | WW: 400 WC: 40 | [Status Bar] │
└─────────────────────────────────────────────────────────────┘
```

### Key Interface Elements

1. **Menu Bar**: Access to main functions and settings
2. **Tool Panel**: Quick access to measurement and annotation tools
3. **Viewer Area**: Main image display with overlay information
4. **Status Bar**: Current slice, zoom level, and window/level settings
5. **Navigation Controls**: Slice navigation and playback controls

## Basic Operations

### Loading a Study
```javascript
// The viewer supports multiple loading methods:
// 1. File upload (local files)
// 2. URL loading (remote DICOM files)
// 3. Drag and drop (desktop files)
// 4. Integration with PACS systems
```

### Navigating Slices
- **Mouse Wheel**: Scroll up/down to navigate slices
- **Arrow Keys**: Use ↑/↓ or ←/→ to move between slices
- **Slider**: Use the slice slider at the bottom
- **Cine Mode**: Click play button for automatic playback

### Basic Image Adjustments
- **Zoom**: Mouse wheel + Ctrl, or zoom tools
- **Pan**: Click and drag with mouse
- **Window/Level**: Right-click and drag, or use adjustment panel
- **Reset**: Double-click to reset all adjustments

## Viewer Modes

The viewer offers different modes optimized for various use cases:

### 1. Simple Mode
- **Best for**: Single slice viewing, basic operations
- **Features**: Essential tools only, fastest performance
- **Use case**: Quick image review, basic measurements

### 2. Multi-Frame Mode
- **Best for**: Multi-slice studies, cine viewing
- **Features**: Advanced navigation, cine player, prefetching
- **Use case**: CT/MRI series, time-series studies

### 3. 3D Mode
- **Best for**: Volume rendering, MPR reconstruction
- **Features**: 3D visualization, multiplanar reconstruction
- **Use case**: 3D anatomy review, surgical planning

### 4. Comprehensive Mode
- **Best for**: Full diagnostic workflow
- **Features**: All tools, AI features, collaboration
- **Use case**: Complete diagnostic review, teaching

## Quick Tips for New Users

### 🎯 **Essential Shortcuts**
- `Space`: Play/pause cine mode
- `R`: Reset view to default
- `F`: Toggle fullscreen
- `Ctrl + Z`: Undo last action
- `F1`: Open help

### 🔧 **Performance Tips**
- Close unused browser tabs for better performance
- Use Chrome or Edge for optimal WebGL support
- Enable hardware acceleration in browser settings
- Ensure adequate RAM for large studies (16GB+ recommended)

### 📏 **Measurement Best Practices**
- Calibrate measurements using known distances when possible
- Use appropriate measurement tools for each task
- Save measurements before switching studies
- Export measurements for documentation

### 🤖 **AI Features**
- AI enhancement works best on high-quality images
- Compare original and enhanced images side-by-side
- Review AI-detected abnormalities carefully
- AI is a diagnostic aid, not a replacement for professional judgment

## Common First-Time Issues

### Issue: Images appear too dark or bright
**Solution**: Adjust window/level settings using right-click drag or the adjustment panel

### Issue: Slow performance with large studies
**Solution**: 
- Enable hardware acceleration
- Close other applications
- Use Multi-Frame mode for better caching
- Consider upgrading system RAM

### Issue: Mouse wheel doesn't navigate slices
**Solution**: 
- Ensure the viewer area has focus (click on it)
- Check browser settings for smooth scrolling
- Try using keyboard arrow keys instead

### Issue: DICOM files won't load
**Solution**:
- Verify files are valid DICOM format
- Check file permissions
- Try loading individual files first
- Contact support if issues persist

## Next Steps

Once you're comfortable with the basics:

1. **Explore Measurement Tools**: Learn to make precise measurements
2. **Try AI Features**: Experiment with image enhancement and analysis
3. **Set Up Collaboration**: Invite colleagues for real-time sessions
4. **Customize Settings**: Adjust preferences for your workflow
5. **Learn Advanced Features**: Explore 3D visualization and MPR

---

**Need Help?** Press `F1` for contextual help or visit our [Troubleshooting Guide](./troubleshooting.md).