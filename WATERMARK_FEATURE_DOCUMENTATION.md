# ArtChive Watermark Feature Documentation

## Overview

The ArtChive watermark feature automatically adds a small, semi-transparent ArtChive logo to images when users download them from posts. This helps protect artist content by branding downloaded images with the ArtChive logo, making it clear where the image originated from.

## Feature Summary

- **Location**: Bottom-right corner of downloaded images
- **Size**: 7% of image dimensions (minimum 20px)
- **Opacity**: 25% (subtle but visible)
- **Trigger**: Right-click on any post image
- **Format**: JPEG (high quality, 95% quality)

## How It Works

### User Flow

1. User views a post with an image
2. User right-clicks on the image
3. Default browser context menu is prevented
4. Image is automatically downloaded with watermark applied
5. Watermarked image is saved to user's downloads folder

### Technical Flow

1. **Event Interception**: The `onContextMenu` handler intercepts right-click events on post images
2. **Image Loading**: The original image is loaded into an HTML5 Canvas element
3. **Logo Loading**: The ArtChive logo is loaded (with fallback to alternative logo files if needed)
4. **Watermark Application**: Logo is drawn onto the canvas at the specified position and opacity
5. **Blob Creation**: Canvas is converted to a JPEG blob
6. **Download Trigger**: A temporary download link is created and programmatically clicked
7. **Cleanup**: Blob URL is revoked to free memory

## Implementation Details

### File Structure

```
frontend/
├── src/
│   ├── utils/
│   │   └── watermark.util.ts          # Core watermark utility functions
│   └── components/
│       └── common/
│           └── posts-feature/
│               └── post-card.component.tsx  # Post display component with download handler
```

### Core Components

#### 1. Watermark Utility (`frontend/src/utils/watermark.util.ts`)

The utility module contains two main functions:

##### `addWatermarkToImage(imageUrl, logoUrl)`

**Purpose**: Adds a watermark to an image and returns a blob URL

**Parameters**:
- `imageUrl` (string): URL of the image to watermark
- `logoUrl` (string, optional): URL of the logo file (defaults to `/logo/mainLogo.png`)

**Returns**: Promise<string> - Blob URL of the watermarked image

**Process**:
1. Creates an `Image` object for the main image
2. Sets `crossOrigin = 'anonymous'` for CORS handling
3. On image load, attempts to load the logo
4. If logo fails, tries alternative logo paths:
   - `/logo/mainLogo.png` (primary)
   - `/logo/ArtChive_logo.png` (fallback 1)
   - `/logo/ArtChive_black.png` (fallback 2)
   - `/logo/ArtChive_transparent(2).png` (fallback 3)
5. If all logos fail, proceeds without watermark
6. Creates a canvas matching the image dimensions
7. Draws the original image onto the canvas
8. Calculates watermark size (7% of image, minimum 20px)
9. Calculates position (bottom-right with padding)
10. Draws logo with 25% opacity
11. Converts canvas to JPEG blob
12. Returns blob URL

**Error Handling**:
- CORS failures: Attempts to load image without `crossOrigin` attribute
- Logo loading failures: Tries alternative logo files, then proceeds without watermark
- Canvas errors: Rejects promise with descriptive error

##### `downloadImageWithWatermark(imageUrl, filename, logoUrl)`

**Purpose**: Downloads an image with watermark applied

**Parameters**:
- `imageUrl` (string): URL of the image to download
- `filename` (string, optional): Filename for download (defaults to `'artchive-image.jpg'`)
- `logoUrl` (string, optional): URL of the logo file

**Returns**: Promise<void>

**Process**:
1. Calls `addWatermarkToImage()` to get watermarked blob URL
2. Creates a temporary `<a>` element
3. Sets `href` to blob URL and `download` attribute to filename
4. Appends link to document body
5. Programmatically clicks the link to trigger download
6. Removes link from DOM
7. Revokes blob URL after 100ms delay to free memory

#### 2. Post Card Component (`frontend/src/components/common/posts-feature/post-card.component.tsx`)

##### Integration Points

**Imports**:
```typescript
import { downloadImageWithWatermark } from "@utils/watermark.util";
import { toast } from "@utils/toast.util";
```

**Event Handlers**:

1. **`handleImageDownload(e)`**
   - Intercepts right-click events (`e.button === 2` or `e.type === 'contextmenu'`)
   - Prevents default browser context menu
   - Stops event propagation
   - Generates filename from post description or post ID
   - Calls `downloadImageWithWatermark()` with image URL and filename
   - Shows error toast if download fails

2. **`handleImageContextMenu(e)`**
   - Wrapper for `handleImageDownload()`
   - Prevents default context menu
   - Triggers download with watermark

**Image Element**:
```tsx
<img
  src={postItem.image_url}
  alt={postItem.description}
  className="w-full h-auto max-h-[600px] object-contain"
  onContextMenu={handleImageContextMenu}
  draggable={false}
/>
```

- `onContextMenu`: Intercepts right-click events
- `draggable={false}`: Prevents drag-to-download (ensures watermark is always applied)

## Watermark Specifications

### Size Calculation

```typescript
const watermarkSize = Math.max(
  Math.min(img.width * 0.07, img.height * 0.07),
  20 // Minimum 20px
);
```

- **Percentage**: 7% of the smaller dimension (width or height)
- **Minimum**: 20 pixels (ensures visibility on very small images)
- **Maximum**: Scales proportionally with image size

### Position Calculation

```typescript
const padding = watermarkSize * 0.5;
const x = canvas.width - watermarkSize - padding;
const y = canvas.height - watermarkSize - padding;
```

- **Location**: Bottom-right corner
- **Padding**: 50% of watermark size (half the watermark size from edges)
- **Coordinates**: Calculated from canvas dimensions minus watermark size and padding

### Opacity

```typescript
ctx.globalAlpha = 0.25; // 25% opacity
```

- **Value**: 0.25 (25% opacity)
- **Effect**: Subtle but visible watermark that doesn't significantly obstruct the image
- **Reset**: Alpha is reset to 1.0 after drawing watermark

### Output Format

- **Format**: JPEG
- **Quality**: 95% (high quality to preserve image details)
- **Color Space**: RGB (converted from RGBA if needed)

## Filename Generation

When downloading, filenames are generated as follows:

```typescript
const filename = postItem.description 
  ? `${postItem.description.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${postItem.post_id.substring(0, 8)}.jpg`
  : `artchive-post-${postItem.post_id.substring(0, 8)}.jpg`;
```

**Logic**:
- If post has description:
  - Take first 30 characters
  - Replace non-alphanumeric characters with underscores
  - Convert to lowercase
  - Append first 8 characters of post ID
  - Add `.jpg` extension
- If no description:
  - Use format: `artchive-post-{first8chars}.jpg`

**Example**:
- Description: "Beautiful sunset painting"
- Post ID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
- Filename: `beautiful_sunset_painting-a1b2c3d4.jpg`

## Error Handling

### Image Loading Errors

1. **CORS Failure**:
   - First attempt: `crossOrigin = 'anonymous'`
   - Fallback: Remove `crossOrigin` attribute and retry
   - Final: Reject with descriptive error message

2. **Invalid Image URL**:
   - Error caught and logged
   - User sees toast notification: "Download failed - Could not download image. Please try again."

### Logo Loading Errors

1. **Primary Logo Fails**:
   - Try alternative logo paths in order
   - If all fail, proceed without watermark
   - Log warning to console

2. **All Logos Fail**:
   - Image is downloaded without watermark
   - Warning logged: "Failed to load watermark logo, proceeding without watermark"

### Canvas Errors

- **Context Creation Failure**: Rejects with "Could not get canvas context"
- **Blob Creation Failure**: Rejects with "Failed to create blob from canvas"
- **Drawing Errors**: Caught and rejected with error details

## Browser Compatibility

### Supported Features

- **HTML5 Canvas**: All modern browsers
- **Blob URLs**: All modern browsers
- **Programmatic Download**: All modern browsers (via `<a download>` attribute)

### Limitations

- **CORS Restrictions**: Images from external domains may fail if CORS headers aren't properly configured
- **Mobile Browsers**: Right-click behavior may differ on mobile devices (long-press instead)
- **Safari**: May have different download behavior in some versions

## Performance Considerations

### Memory Management

- **Blob URLs**: Automatically revoked after 100ms to prevent memory leaks
- **Canvas Cleanup**: Canvas elements are garbage collected after use
- **Image Objects**: Released after canvas operations complete

### Processing Time

- **Small Images** (< 1MB): ~100-300ms
- **Medium Images** (1-5MB): ~300-800ms
- **Large Images** (> 5MB): ~800ms-2s

**Factors**:
- Image size (larger = slower)
- Network speed (if image needs to be fetched)
- Device performance (CPU/GPU)

### Optimization Opportunities

1. **Image Caching**: Cache loaded images to avoid re-fetching
2. **Logo Preloading**: Preload logo on app initialization
3. **Web Workers**: Move canvas operations to web worker for large images
4. **Progressive Loading**: Show loading indicator during watermark application

## Security Considerations

### CORS (Cross-Origin Resource Sharing)

- Images from external domains (e.g., Cloudinary) must have proper CORS headers
- `crossOrigin = 'anonymous'` is used to request CORS-enabled images
- Falls back to non-CORS mode if needed (may fail with tainted canvas)

### Content Security Policy (CSP)

- Blob URLs are allowed by default in most CSP configurations
- Canvas operations may be restricted by strict CSP policies
- Ensure CSP allows `blob:` URLs if using strict policies

## Future Enhancements

### Potential Improvements

1. **User Preferences**:
   - Allow users to toggle watermark on/off
   - Customize watermark position (center, corners, custom)
   - Adjust watermark opacity

2. **Watermark Variants**:
   - Different logo styles
   - Text watermark option ("ArtChive" text instead of logo)
   - User-specific watermarks

3. **Server-Side Watermarking**:
   - Apply watermark on image upload
   - Store watermarked versions on server
   - Faster downloads (no client-side processing)

4. **Batch Downloads**:
   - Watermark multiple images at once
   - Download gallery as ZIP with watermarks

5. **Watermark Metadata**:
   - Embed user information in watermark
   - Include timestamp
   - Add post URL or ID

6. **Advanced Features**:
   - Invisible watermark (steganography) in addition to visible
   - Watermark detection/verification tools
   - Analytics on watermark usage

## Testing

### Manual Testing Checklist

- [ ] Right-click on post image triggers download
- [ ] Downloaded image contains watermark
- [ ] Watermark appears in bottom-right corner
- [ ] Watermark is visible but not obtrusive (25% opacity)
- [ ] Watermark size is appropriate (7% of image)
- [ ] Filename is generated correctly
- [ ] Error handling works (invalid URLs, CORS failures)
- [ ] Logo fallback works (if primary logo fails)
- [ ] Works with different image sizes
- [ ] Works with different image formats (JPEG, PNG, WebP)
- [ ] Memory cleanup works (no leaks)

### Test Cases

1. **Normal Download**:
   - Right-click image → Download with watermark ✓

2. **CORS Failure**:
   - Image from external domain without CORS → Should attempt fallback

3. **Logo Failure**:
   - Primary logo missing → Should try alternatives → Should proceed without watermark if all fail

4. **Large Image**:
   - 10MB image → Should still work (may be slower)

5. **Small Image**:
   - 100x100px image → Watermark should be minimum 20px

6. **No Description**:
   - Post without description → Filename should use post ID format

## Troubleshooting

### Common Issues

**Issue**: Watermark not appearing
- **Cause**: Logo file not found or CORS issue
- **Solution**: Check logo file paths, verify CORS headers on image source

**Issue**: Download not triggering
- **Cause**: Browser blocking programmatic downloads
- **Solution**: Check browser settings, ensure user interaction initiated download

**Issue**: Image quality degraded
- **Cause**: JPEG compression or canvas scaling
- **Solution**: Increase JPEG quality (currently 95%), ensure proper image dimensions

**Issue**: CORS errors in console
- **Cause**: Image source doesn't allow cross-origin access
- **Solution**: Configure CORS headers on image server, or use proxy

## Code Examples

### Basic Usage

```typescript
import { downloadImageWithWatermark } from "@utils/watermark.util";

// Download image with default watermark
await downloadImageWithWatermark(
  'https://example.com/image.jpg',
  'my-image.jpg'
);
```

### Custom Logo

```typescript
await downloadImageWithWatermark(
  'https://example.com/image.jpg',
  'my-image.jpg',
  '/custom/logo.png'
);
```

### Get Watermarked Blob URL

```typescript
import { addWatermarkToImage } from "@utils/watermark.util";

const watermarkedUrl = await addWatermarkToImage(
  'https://example.com/image.jpg'
);
// Use watermarkedUrl for display or further processing
```

## Conclusion

The ArtChive watermark feature provides a seamless way to brand downloaded images while maintaining a subtle, non-intrusive appearance. The implementation is robust, with comprehensive error handling and fallback mechanisms. The feature helps protect artist content and promotes the ArtChive platform through branded downloads.

---

**Last Updated**: [Current Date]  
**Version**: 1.0  
**Author**: Development Team

