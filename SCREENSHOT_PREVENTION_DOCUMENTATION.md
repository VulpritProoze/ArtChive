# ArtChive Screenshot Prevention Feature Documentation

## Overview

The ArtChive screenshot prevention feature implements multiple layers of protection to prevent users from taking screenshots of the website. This helps protect artist content and intellectual property by making it more difficult to capture images from the platform.

## Feature Summary

- **Right-Click Prevention**: Disables context menu on right-click
- **Keyboard Shortcut Blocking**: Prevents Print Screen, Ctrl+P, Ctrl+S, F12, and other screenshot-related shortcuts
- **DevTools Detection**: Detects when browser DevTools are opened and blurs the page
- **Screen Capture Detection**: Blocks browser screen capture APIs (getDisplayMedia, screen sharing)
- **Text Selection Prevention**: Prevents text selection and copying
- **Drag Prevention**: Prevents dragging images and content
- **Visual Warnings**: Shows warning messages when screenshot attempts are detected

## How It Works

### Protection Layers

1. **Event Interception**: Intercepts mouse and keyboard events to prevent screenshot-related actions
2. **API Override**: Overrides browser APIs that could be used for screen capture
3. **DevTools Monitoring**: Continuously monitors window dimensions to detect DevTools
4. **CSS Protection**: Applies CSS rules to prevent text selection and image dragging
5. **Visual Feedback**: Displays warning overlays when protection is triggered

### Technical Flow

1. **Initialization**: Screenshot prevention is enabled globally when the app loads
2. **Event Listeners**: Event listeners are attached to document and window
3. **API Override**: Browser media APIs are overridden to block screen capture
4. **Monitoring**: DevTools detection runs on an interval
5. **Cleanup**: All listeners and overrides are removed when disabled

## Implementation Details

### File Structure

```
frontend/
├── src/
│   ├── utils/
│   │   └── screenshot-prevention.util.ts    # Core prevention utility
│   ├── hooks/
│   │   └── use-screenshot-prevention.hook.ts # React hook
│   └── App.tsx                               # Global integration
```

### Core Components

#### 1. Screenshot Prevention Utility (`frontend/src/utils/screenshot-prevention.util.ts`)

The utility module contains the `ScreenshotPrevention` class that implements all protection mechanisms.

##### `enableScreenshotPrevention(config)`

**Purpose**: Enable screenshot prevention with custom configuration

**Parameters**:
- `config` (ScreenshotPreventionConfig, optional): Configuration object
  - `disableRightClick` (boolean): Disable right-click context menu (default: true)
  - `disableKeyboardShortcuts` (boolean): Block keyboard shortcuts (default: true)
  - `detectDevTools` (boolean): Detect DevTools opening (default: true)
  - `detectScreenCapture` (boolean): Detect screen capture APIs (default: true)
  - `disableTextSelection` (boolean): Prevent text selection (default: true)
  - `disableDrag` (boolean): Prevent dragging (default: true)
  - `showWarning` (boolean): Show warning messages (default: true)
  - `warningMessage` (string): Custom warning message

**Returns**: void

**Process**:
1. Creates a `ScreenshotPrevention` instance
2. Enables all configured protection layers
3. Sets up event listeners
4. Overrides browser APIs
5. Starts monitoring intervals

##### `disableScreenshotPrevention()`

**Purpose**: Disable screenshot prevention and restore original functionality

**Returns**: void

**Process**:
1. Removes all event listeners
2. Restores original browser APIs
3. Clears monitoring intervals
4. Removes protection styles
5. Cleans up overlay elements

##### `isScreenshotPreventionEnabled()`

**Purpose**: Check if screenshot prevention is currently enabled

**Returns**: boolean

#### 2. React Hook (`frontend/src/hooks/use-screenshot-prevention.hook.ts`)

##### `useScreenshotPrevention(options)`

**Purpose**: React hook to enable/disable screenshot prevention

**Parameters**:
- `options` (UseScreenshotPreventionOptions): Configuration options (same as utility config)

**Returns**: void

**Usage**:
```tsx
function MyComponent() {
  useScreenshotPrevention({
    enabled: true,
    disableRightClick: true,
    disableKeyboardShortcuts: true,
    detectDevTools: true,
    showWarning: true,
    warningMessage: 'Screenshots are not allowed.',
  });

  return <div>Protected content</div>;
}
```

## Protection Mechanisms

### Right-Click Prevention

**Method**: Intercepts `contextmenu` and `mousedown` events

**Blocked Actions**:
- Right-click context menu
- Long-press context menu (mobile)

**Implementation**:
```typescript
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  e.stopPropagation();
  return false;
});
```

### Keyboard Shortcut Blocking

**Blocked Shortcuts**:
- `PrintScreen` / `PrtScn` - Print Screen key
- `Ctrl+P` - Print dialog
- `Ctrl+S` - Save page
- `Ctrl+Shift+I` - Open DevTools
- `Ctrl+Shift+C` - Element Inspector
- `Ctrl+Shift+J` - Console
- `F12` - DevTools
- `Ctrl+U` - View page source

**Implementation**:
```typescript
document.addEventListener('keydown', (e) => {
  if (e.key === 'PrintScreen' || e.ctrlKey && e.key === 'p') {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
});
```

### DevTools Detection

**Method**: Monitors window dimensions to detect DevTools

**Detection Logic**:
- Compares `window.outerWidth` vs `window.innerWidth`
- Compares `window.outerHeight` vs `window.innerHeight`
- If difference > 160px, DevTools is likely open

**Response**:
- Shows warning message
- Blurs page content (5px blur filter)
- Restores when DevTools is closed

**Implementation**:
```typescript
const checkDevTools = () => {
  const widthDiff = window.outerWidth - window.innerWidth;
  const heightDiff = window.outerHeight - window.innerHeight;
  
  if (widthDiff > 160 || heightDiff > 160) {
    // DevTools detected
    document.body.style.filter = 'blur(5px)';
    showWarning();
  }
};

setInterval(checkDevTools, 500);
```

### Screen Capture Detection

**Method**: Overrides browser media APIs

**Blocked APIs**:
- `navigator.mediaDevices.getDisplayMedia()` - Screen capture API
- `navigator.mediaDevices.getUserMedia()` - When used for screen capture

**Implementation**:
```typescript
const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
navigator.mediaDevices.getDisplayMedia = async () => {
  showWarning();
  throw new Error('Screen capture is not allowed');
};
```

### Text Selection Prevention

**Method**: CSS and event interception

**CSS Rules**:
```css
* {
  -webkit-user-select: none !important;
  -moz-user-select: none !important;
  -ms-user-select: none !important;
  user-select: none !important;
  -webkit-touch-callout: none !important;
}
```

**Event Interception**:
```typescript
document.addEventListener('selectstart', (e) => {
  e.preventDefault();
  return false;
});
```

### Drag Prevention

**Method**: Event interception and CSS

**CSS Rules**:
```css
img {
  -webkit-user-drag: none !important;
  user-drag: none !important;
}
```

**Event Interception**:
```typescript
document.addEventListener('dragstart', (e) => {
  e.preventDefault();
  e.stopPropagation();
  return false;
});
```

## Warning System

### Warning Overlay

When a screenshot attempt is detected, a warning overlay is displayed:

- **Position**: Fixed, full screen
- **Background**: Black with 90% opacity
- **Text**: Red, bold, centered
- **Duration**: 3 seconds (auto-hides)
- **Z-Index**: 999999 (above all content)

### Customization

You can customize the warning message:

```typescript
useScreenshotPrevention({
  warningMessage: 'Custom warning message here',
});
```

## Browser Compatibility

### Supported Features

- **Right-Click Prevention**: All modern browsers
- **Keyboard Shortcuts**: All modern browsers
- **DevTools Detection**: All modern browsers (may vary in accuracy)
- **Screen Capture Detection**: Chrome, Edge, Firefox (limited in Safari)
- **Text Selection Prevention**: All modern browsers
- **Drag Prevention**: All modern browsers

### Limitations

1. **OS-Level Screenshots**: Cannot prevent OS-level screenshot tools (Windows Snipping Tool, macOS Screenshot, etc.)
2. **Browser Extensions**: Cannot prevent browser extensions that capture screenshots
3. **Mobile Screenshots**: Limited protection on mobile devices (hardware buttons)
4. **DevTools Detection**: May have false positives on certain screen sizes
5. **Screen Capture APIs**: Some browsers may not support API overriding

## Security Considerations

### Important Notes

⚠️ **Screenshot prevention is not 100% secure**. Determined users can still capture screenshots using:
- OS-level tools (Snipping Tool, Screenshot, etc.)
- Browser extensions
- Mobile device hardware buttons
- Virtual machines
- Screen recording software
- Camera/photography

### Best Practices

1. **Use as Deterrent**: Screenshot prevention works best as a deterrent, not absolute protection
2. **Combine with Watermarking**: Use alongside watermarking (already implemented) for better protection
3. **Server-Side Protection**: Implement additional server-side protections for sensitive content
4. **User Education**: Inform users about content protection policies
5. **Legal Protection**: Use terms of service and legal agreements

## Performance Considerations

### Impact

- **Memory**: Minimal (event listeners and intervals)
- **CPU**: Low (DevTools check runs every 500ms)
- **Network**: None
- **Rendering**: Minimal (CSS rules applied globally)

### Optimization

- DevTools detection interval: 500ms (configurable)
- Event listeners: Only active when enabled
- Cleanup: All resources cleaned up when disabled

## Configuration Examples

### Basic Usage (Default)

```tsx
function App() {
  useScreenshotPrevention();
  return <div>Protected content</div>;
}
```

### Custom Configuration

```tsx
function App() {
  useScreenshotPrevention({
    enabled: true,
    disableRightClick: true,
    disableKeyboardShortcuts: true,
    detectDevTools: true,
    detectScreenCapture: true,
    disableTextSelection: false, // Allow text selection
    disableDrag: true,
    showWarning: true,
    warningMessage: 'Please respect artist content. Screenshots are not allowed.',
  });
  return <div>Protected content</div>;
}
```

### Conditional Enable

```tsx
function App() {
  const { isAuthenticated } = useAuth();
  
  useScreenshotPrevention({
    enabled: isAuthenticated, // Only enable for authenticated users
  });
  
  return <div>Content</div>;
}
```

### Disable Specific Features

```tsx
function App() {
  useScreenshotPrevention({
    enabled: true,
    disableTextSelection: false, // Allow text selection
    disableDrag: false, // Allow dragging
    detectDevTools: false, // Don't detect DevTools
  });
  return <div>Partially protected content</div>;
}
```

## Troubleshooting

### Common Issues

**Issue**: Right-click still works
- **Cause**: Browser extension or OS-level override
- **Solution**: Check browser extensions, some may bypass prevention

**Issue**: DevTools detection false positives
- **Cause**: Window size differences on certain screen sizes
- **Solution**: Adjust threshold or disable DevTools detection

**Issue**: Screen capture still works
- **Cause**: Browser doesn't support API overriding or OS-level tool used
- **Solution**: This is expected - prevention cannot block all methods

**Issue**: Text selection still works
- **Cause**: Browser-specific behavior or extension
- **Solution**: Check browser compatibility, some browsers may ignore CSS rules

**Issue**: Performance impact
- **Cause**: DevTools detection running too frequently
- **Solution**: Increase interval or disable DevTools detection

## Testing

### Manual Testing Checklist

- [ ] Right-click is disabled
- [ ] Print Screen key is blocked
- [ ] Ctrl+P is blocked
- [ ] Ctrl+S is blocked
- [ ] F12 is blocked
- [ ] DevTools detection works (opens DevTools → page blurs)
- [ ] Warning message appears on attempts
- [ ] Text selection is disabled
- [ ] Image dragging is disabled
- [ ] Screen capture APIs are blocked
- [ ] Cleanup works (disable → restore functionality)

### Test Cases

1. **Right-Click Test**:
   - Right-click anywhere → Should show warning, no context menu

2. **Keyboard Shortcut Test**:
   - Press Print Screen → Should show warning, no screenshot
   - Press Ctrl+P → Should show warning, no print dialog

3. **DevTools Test**:
   - Open DevTools (F12) → Page should blur, warning shown
   - Close DevTools → Page should restore

4. **Screen Capture Test**:
   - Try to use browser screen capture → Should fail with error

5. **Text Selection Test**:
   - Try to select text → Should not be selectable

6. **Drag Test**:
   - Try to drag image → Should not be draggable

## Future Enhancements

### Potential Improvements

1. **Advanced DevTools Detection**: More sophisticated detection methods
2. **Watermark Integration**: Combine with watermarking for visual protection
3. **Analytics**: Track screenshot attempt events
4. **User-Specific Settings**: Allow users to configure protection levels
5. **Content-Specific Protection**: Enable protection only on certain pages
6. **Server-Side Validation**: Verify content integrity server-side
7. **DRM Integration**: Use browser DRM for stronger protection (limited support)

## Code Examples

### Enable in App Component

```tsx
import { useScreenshotPrevention } from '@hooks/use-screenshot-prevention.hook';

function App() {
  useScreenshotPrevention({
    enabled: true,
    warningMessage: 'Screenshots are not allowed on this website.',
  });

  return (
    <div>
      {/* App content */}
    </div>
  );
}
```

### Enable in Specific Component

```tsx
import { useScreenshotPrevention } from '@hooks/use-screenshot-prevention.hook';

function ProtectedGallery() {
  useScreenshotPrevention({
    enabled: true,
    disableRightClick: true,
    disableKeyboardShortcuts: true,
  });

  return (
    <div>
      {/* Protected gallery content */}
    </div>
  );
}
```

### Programmatic Control

```tsx
import { 
  enableScreenshotPrevention, 
  disableScreenshotPrevention 
} from '@utils/screenshot-prevention.util';

function MyComponent() {
  const handleEnable = () => {
    enableScreenshotPrevention({
      showWarning: true,
    });
  };

  const handleDisable = () => {
    disableScreenshotPrevention();
  };

  return (
    <div>
      <button onClick={handleEnable}>Enable Protection</button>
      <button onClick={handleDisable}>Disable Protection</button>
    </div>
  );
}
```

## Conclusion

The ArtChive screenshot prevention feature provides multiple layers of protection to deter users from capturing screenshots. While not 100% secure, it works effectively as a deterrent when combined with watermarking and other content protection measures. The feature is highly configurable and can be enabled globally or on specific components as needed.

---

**Last Updated**: [Current Date]  
**Version**: 1.0  
**Author**: Development Team

