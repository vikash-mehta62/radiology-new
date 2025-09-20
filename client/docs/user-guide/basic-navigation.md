# Basic Navigation

Master the fundamental navigation techniques to efficiently review medical imaging studies.

## Slice Navigation

### Mouse Controls
- **Mouse Wheel**: Primary method for slice navigation
  - Scroll up: Next slice
  - Scroll down: Previous slice
  - Smooth scrolling with momentum support

- **Click Navigation**: 
  - Click slice numbers in the timeline
  - Use navigation arrows (◀ ▶)
  - Click and drag the slice slider

### Keyboard Controls
```
Arrow Keys:
  ↑ / ↓     Navigate slices vertically
  ← / →     Navigate slices horizontally
  
Page Keys:
  Page Up   Jump 10 slices forward
  Page Down Jump 10 slices backward
  
Home/End:
  Home      Go to first slice
  End       Go to last slice
  
Playback:
  Space     Play/Pause cine mode
  Enter     Step forward one slice
```

### Touch Controls (Mobile/Tablet)
- **Swipe**: Swipe up/down or left/right to navigate slices
- **Pinch**: Pinch to zoom in/out
- **Two-finger drag**: Pan the image
- **Tap**: Tap slice numbers for direct navigation

## Cine Player Controls

The cine player allows automatic playback through slice sequences.

### Basic Playback
```
Controls:
  ⏯️  Play/Pause    Toggle automatic playback
  ⏮️  First Slice   Jump to beginning
  ⏭️  Last Slice    Jump to end
  ⏪  Rewind        Play backward
  ⏩  Fast Forward  Play forward (2x speed)
```

### Speed Control
- **Slider**: Adjust playback speed (1-30 FPS)
- **Presets**: Common speeds (5, 10, 15, 30 FPS)
- **Custom**: Enter specific frame rate

### Loop Options
- **Loop**: Continuous playback from first to last slice
- **Bounce**: Play forward then backward continuously
- **Once**: Play through sequence once and stop

## Image Manipulation

### Zoom Controls
```
Mouse:
  Ctrl + Wheel     Zoom in/out at cursor position
  Double-click     Fit image to window
  
Keyboard:
  Ctrl + +         Zoom in
  Ctrl + -         Zoom out
  Ctrl + 0         Reset zoom to 100%
  
Touch:
  Pinch            Zoom in/out
  Double-tap       Fit to window
```

### Pan Controls
```
Mouse:
  Click + Drag     Pan image in any direction
  Middle-click     Reset pan to center
  
Keyboard:
  Shift + Arrows   Pan in small increments
  
Touch:
  Two-finger drag  Pan image
```

### Rotation
```
Mouse:
  Ctrl + Shift + Drag    Rotate image
  
Keyboard:
  Ctrl + R               Rotate 90° clockwise
  Ctrl + Shift + R       Rotate 90° counter-clockwise
  
Buttons:
  🔄 Rotate CW           90° clockwise
  🔃 Rotate CCW          90° counter-clockwise
```

## Window/Level Adjustment

Window and level adjustments are crucial for optimal image contrast.

### Mouse Control
```
Right-click + Drag:
  Horizontal drag    Adjust window width
  Vertical drag      Adjust window center/level
  
Ctrl + Right-click:
  Fine adjustment mode (slower, more precise)
```

### Keyboard Shortcuts
```
Window Width:
  W / Shift + W      Increase/decrease window width
  
Window Center:
  L / Shift + L      Increase/decrease window center
  
Presets:
  1-9               Apply preset window/level settings
  0                 Reset to default window/level
```

### Preset Window/Level Settings
Common presets for different anatomical regions:

| Key | Preset | Window | Level | Use Case |
|-----|--------|--------|-------|----------|
| 1 | Lung | 1500 | -600 | Chest CT |
| 2 | Mediastinum | 350 | 50 | Chest CT |
| 3 | Abdomen | 350 | 40 | Abdominal CT |
| 4 | Brain | 80 | 40 | Head CT |
| 5 | Bone | 2000 | 300 | Bone detail |
| 6 | Soft Tissue | 400 | 40 | General soft tissue |

## Advanced Navigation Features

### Slice Synchronization
When viewing multiple studies or series:
- **Link Scrolling**: Navigate all viewers simultaneously
- **Reference Lines**: Show corresponding slice positions
- **Anatomical Matching**: Align based on anatomy

### Smart Navigation
- **Predictive Loading**: System preloads likely next slices
- **Adaptive Caching**: Optimizes based on navigation patterns
- **Background Processing**: Loads slices in background

### Navigation Indicators
```
Status Bar Information:
  Slice: 45/150        Current slice and total count
  Position: 123.5mm    Anatomical position
  Thickness: 1.25mm    Slice thickness
  Spacing: 1.25mm      Slice spacing
```

## Navigation Tips and Best Practices

### 🎯 **Efficient Slice Review**
1. **Use cine mode** for initial overview
2. **Slow down** for areas of interest
3. **Use keyboard shortcuts** for precise navigation
4. **Bookmark** important slices for later review

### 🔧 **Performance Optimization**
1. **Let images load** before rapid navigation
2. **Use appropriate viewer mode** for your task
3. **Close unused studies** to free memory
4. **Enable hardware acceleration** for smooth scrolling

### 📏 **Measurement Workflow**
1. **Navigate to slice** of interest first
2. **Adjust window/level** for optimal contrast
3. **Zoom appropriately** for measurement accuracy
4. **Use reference slices** for context

### 🎨 **Display Optimization**
1. **Adjust room lighting** to minimize reflections
2. **Use consistent window/level** settings
3. **Calibrate monitor** regularly
4. **Position screen** at appropriate viewing distance

## Troubleshooting Navigation Issues

### Slow or Jerky Navigation
**Causes**: Insufficient system resources, large file sizes
**Solutions**:
- Enable hardware acceleration
- Close other applications
- Use lower quality preview mode
- Upgrade system RAM

### Mouse Wheel Not Working
**Causes**: Browser settings, focus issues
**Solutions**:
- Click on viewer area to ensure focus
- Check browser smooth scrolling settings
- Try keyboard navigation instead
- Restart browser if needed

### Images Not Loading
**Causes**: Network issues, file corruption, memory limits
**Solutions**:
- Check network connection
- Verify file integrity
- Try loading smaller studies first
- Clear browser cache

### Inconsistent Performance
**Causes**: Background processes, thermal throttling
**Solutions**:
- Monitor system resources
- Ensure adequate cooling
- Close unnecessary applications
- Use performance mode in viewer settings

## Navigation Customization

### Keyboard Shortcuts
Customize keyboard shortcuts in Settings > Keyboard:
- Assign preferred keys for common actions
- Create custom shortcuts for specific workflows
- Import/export shortcut configurations

### Mouse Behavior
Adjust mouse sensitivity and behavior:
- Scroll speed for slice navigation
- Zoom sensitivity
- Pan acceleration
- Right-click behavior

### Touch Gestures
Configure touch controls for tablets:
- Swipe sensitivity
- Pinch zoom behavior
- Multi-touch gestures
- Gesture recognition threshold

---

**Next**: Learn about [Viewer Modes](./viewer-modes.md) to optimize your workflow for different types of studies.