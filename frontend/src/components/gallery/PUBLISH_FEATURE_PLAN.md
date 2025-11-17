# Gallery Publish Feature Implementation Plan

## Overview

Implement a complete gallery publishing system that allows users to publish their galleries, view published galleries at `/gallery/:user-id`, and includes header auto-hide functionality.

## Backend Changes

### 1. New API Endpoint: Get Active Gallery by User ID ✅ IMPLEMENTED

**File**: `backend/gallery/views.py`

- Create `GalleryActiveView` class:
  - Route: `GET /api/gallery/user/<user_id>/active/`
  - Returns the active gallery for the specified user
  - **Validation**: Check if user has multiple active galleries
    - If 2+ active galleries found, return error response:
      ```json
      {
        "error": "Multiple active galleries detected. Please contact ArtChive staff for assistance.",
        "code": "MULTIPLE_ACTIVE_GALLERIES"
      }
      ```

    - Status code: 500 (Internal Server Error)
  - If no active gallery, return 404
  - If exactly one active gallery, return it

**File**: `backend/gallery/urls.py`

- Add route: `path('user/<int:user_id>/active/', GalleryActiveView.as_view(), name='gallery-active-by-user')`

**File**: `backend/gallery/serializers.py`

- No changes needed (reuse `GallerySerializer`)

## Frontend Changes

### 2. Publish Modal Component ✅ IMPLEMENTED

**File**: `frontend/src/components/gallery/publish-gallery.modal.tsx` (NEW)

- Modal component that displays list of user's galleries
- Features:
  - List all galleries (from `galleries` prop)
  - Show gallery title, description, status
  - **If there is an active gallery:**
    - Disable ALL galleries (cannot select any)
    - Show visual indicator (badge/icon) for the active gallery
    - Disable the "Publish" button in the modal
    - Show message: "You already have an active gallery. Archive it first to publish another."
  - **If there is NO active gallery:**
    - Allow selecting one gallery (radio button or clickable card)
    - Enable "Publish" button when a gallery is selected
    - Disable "Publish" button when no gallery is selected
  - Single "Publish" button at the bottom of the modal (not per gallery)
  - Cancel button to close modal
- State:
  - `selectedGalleryId: string | null` - Track which gallery is selected
  - `hasActiveGallery: boolean` - Check if any gallery has status 'active'
- Props:
  ```typescript
  interface PublishGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    galleries: Gallery[];
    onPublish: (galleryId: string) => Promise<void>;
  }
  ```


### 3. Update Galleries Component ✅ IMPLEMENTED

**File**: `frontend/src/components/gallery/galleries.component.tsx`

- Add "Publish" button in header (next to "Create Gallery")
- Add state for publish modal: `const [showPublishModal, setShowPublishModal] = useState(false)`
- Check if user has active galleries:
  - Filter galleries: `const hasActiveGallery = galleries.some(g => g.status === 'active')`
  - Disable "Publish" button if `hasActiveGallery === true`
  - Show tooltip/disabled state: "You already have an active gallery. Archive it first to publish another."
- Add `handlePublish` function:
  ```typescript
  const handlePublish = async (galleryId: string) => {
    try {
      await galleryService.updateGalleryStatus(galleryId, 'active');
      toast.success('Gallery published successfully!');
      setShowPublishModal(false);
      loadGalleries(); // Refresh list
    } catch (error) {
      // Handle error (e.g., another gallerye is active)
      toast.error('Failed to publish gallery');
    }
  };
  ```

- Render `PublishGalleryModal` component

### 4. Published Gallery View Component

**File**: `frontend/src/components/gallery/published-gallery.view.tsx` (NEW)

- Route: `/gallery/:user-id`
- Features:
  - Fetch active gallery using new backend endpoint
  - **Convert canvas objects to HTML/CSS and render as a real webpage**
  - All content is static (no interactions, no editing)
  - **Fixed width and height based on actual canvas dimensions from canvas_json**
  - Handle loading and error states
  - Show error message if multiple active galleries detected (contact staff)
- Props/Route params:
  - `userId` from route params
- State:
  - `gallery: Gallery | null`
  - `isLoading: boolean`
  - `error: string[] | null` (array of error messages)
- Error Handling:
  - Use `handleApiError` utility from `@utils/handle-api-error.ts`
  - Set `returnAllMessagesAsArray = true` to get all error messages as an array
  - Display all error messages from the array
  - Example implementation:
    ```typescript
    import handleApiError from '@utils/handle-api-error';
    
    try {
      const gallery = await galleryService.getActiveGalleryByUserId(userId);
      setGallery(gallery);
    } catch (error) {
      const errorMessages = handleApiError(error, {}, true, true) as string[];
      setError(errorMessages);
    }
    ```
- Use `MainLayout` with header auto-hide feature (see below)
- Component structure:
  - Fetch gallery on mount using `useEffect`
  - **Use fixed dimensions from `gallery.canvas_width` and `gallery.canvas_height`**
  - Render container div with fixed width/height matching canvas dimensions
  - Map through `gallery.canvas_json.objects` and render each using renderer utility
  - Sort objects by `zIndex` if present (or maintain array order)
  - Filter out objects where `visible === false`
  - **No scaling applied - render at 1:1 pixel ratio**

**File**: `frontend/src/utils/canvas-to-html-renderer.tsx` (NEW)

- Create utility functions to convert canvas objects to HTML elements
- Main function: `renderCanvasObjectToHTML(object: CanvasObject): JSX.Element`
  - **No scale parameter - render at 1:1 pixel ratio**
- Handle all object types:
  - **TextObject**: Convert to `<div>` or `<p>` with absolute positioning, font styles, transforms
  - **ImageObject**: Convert to `<img>` with absolute positioning, src, dimensions, transforms, handle cropping
  - **RectObject**: Convert to `<div>` with absolute positioning, background, border, border-radius
  - **CircleObject**: Convert to `<div>` with `border-radius: 50%`, background, border
  - **LineObject**: Convert to `<svg>` or `<div>` with line rendering
  - **GroupObject**: Convert to container `<div>` with relative positioning, recursively render children
  - **FrameObject**: Convert to container `<div>` with border, render children inside
  - **GalleryItemObject**: Same as GroupObject (treat as container)
- Helper function: `applyTransformStyles(object: BaseCanvasObject): React.CSSProperties`
  - Build CSS transform string from rotation, scaleX, scaleY
  - Apply opacity and zIndex
  - **No scaling applied to dimensions**

### 5. Header Auto-Hide Feature

**File**: `frontend/src/components/common/layout/MainLayout.tsx`

- Add auto-hide functionality:
  - Header starts visible
  - After 3 seconds (configurable), header slides up and hides
  - On scroll up or mouse move to top, header reappears
  - On scroll down, header hides again
- Implementation:
  - Add state: `const [headerVisible, setHeaderVisible] = useState(true)`
  - Add `useEffect` for auto-hide timer (3 seconds)
  - Add scroll listener to show/hide on scroll
  - Add mouse move listener to show when mouse near top
  - Apply CSS transition for smooth slide animation
- Make it conditional (for now, always enabled; future: use global user preference)
- Add prop: `autoHideHeader?: boolean` (default: `true` for published gallery view, `false` for other pages)

### 6. Update Gallery Service

**File**: `frontend/src/services/gallery.service.ts`

- Add method:
  ```typescript
  async getActiveGalleryByUserId(userId: number): Promise<Gallery> {
    const response = await gallery.get(`user/${userId}/active/`);
    return response.data;
  }
  ```


### 7. Update App Routes

**File**: `frontend/src/App.tsx`

- Add new route:
  ```typescript
  <Route path="/gallery/:userId" element={<PublishedGalleryView />} />
  ```

- Import `PublishedGalleryView` component
- This route should be inside `<Route element={<ProtectedRoute />}>` block (requires authentication)

## Implementation Details

### HTML/CSS Rendering for Published View

- **Convert canvas objects to HTML elements** instead of using CanvasStage
- **Positioning Strategy**:
  - Container div uses `position: relative` with **fixed dimensions** matching `canvas_width` and `canvas_height` from canvas_json
  - All objects use `position: absolute` relative to container
  - Groups use `position: relative`, children use `position: absolute` relative to group
- **Fixed Size Strategy**:
  - **Use exact dimensions from `gallery.canvas_width` and `gallery.canvas_height`**
  - **No scaling applied - render objects at their exact pixel dimensions**
  - Container div: `width: ${canvas_width}px; height: ${canvas_height}px`
  - All object dimensions (x, y, width, height, fontSize, radius, strokeWidth, etc.) use exact values from canvas_json
  - **No viewport calculations or responsive scaling**
- **Transform Handling**:
  - Rotation: `transform: rotate(${rotation}deg)`
  - Scale: `transform: scale(${scaleX || 1}, ${scaleY || 1})`
  - Combined: `transform: translate(...) rotate(...) scale(...)`
  - Transform origin: `transform-origin: top left` (or center for circles)
  - Opacity: `opacity: ${opacity || 1}`
- **Z-Index**: Use `zIndex` property if present, otherwise maintain array order
- **Visibility**: Filter out objects where `visible === false`
- **Image Cropping**: If crop properties exist, use CSS `object-fit: none` and `object-position`
- **Static Content**: No event handlers, no cursor changes, no selection, no interactions

### Error Handling

- **Multiple Active Galleries**: Show user-friendly error message with contact information
- **No Active Gallery**: Show "No active gallery found" message
- **Network Errors**: Show appropriate error messages with retry option

### User Experience

- Publish button disabled state is clear and informative
- Modal shows gallery status clearly
- Published view is clean and focused on content
- Header auto-hide is smooth and non-intrusive
- Loading states for all async operations

## Testing Checklist

- [ ] Publish button appears in galleries list
- [ ] Publish button is disabled when user has active gallery
- [ ] Publish modal shows all galleries
- [ ] When active gallery exists: all galleries are disabled/unselectable in modal
- [ ] When active gallery exists: visual indicator shows which gallery is active
- [ ] When active gallery exists: Publish button in modal is disabled
- [ ] When no active gallery: user can select one gallery
- [ ] When no active gallery: Publish button is enabled only when gallery is selected
- [ ] Publishing a gallery sets status to 'active'
- [ ] Publishing fails if another gallery is active (backend validation)
- [ ] Published gallery view loads correctly at `/gallery/:user-id`
- [ ] Published gallery view renders as HTML webpage (not canvas)
- [ ] Canvas-to-HTML renderer utility works correctly
- [ ] All canvas object types are converted to HTML elements correctly
- [ ] Text objects render as HTML text with correct styling
- [ ] Image objects render as HTML images with correct src and dimensions
- [ ] Rect objects render as divs with correct background and borders
- [ ] Circle objects render as divs with border-radius: 50%
- [ ] Line objects render correctly (SVG or CSS)
- [ ] Group objects contain children correctly with relative positioning
- [ ] Frame objects render with borders and contain images
- [ ] Transformations (rotation, scale, opacity) apply correctly via CSS
- [ ] Z-index ordering works correctly
- [ ] Objects with visible: false are not rendered
- [ ] Canvas renders at fixed dimensions matching canvas_json
- [ ] Objects render at exact pixel dimensions (1:1 ratio)
- [ ] All content is static (no interactions, no event handlers)
- [ ] Header auto-hides after 3 seconds
- [ ] Header reappears on scroll up or mouse move to top
- [ ] Error handling for multiple active galleries
- [ ] Error handling for no active gallery

## Known Issues

### ⚠️ Objects Do Not Fit One-to-One

**Status**: ⚠️ CURRENT LIMITATION

**Description**: Objects in the published gallery view do not render at exactly 1:1 pixel ratio with the canvas editor. The current implementation uses fixed dimensions from canvas_json, but there may be discrepancies in how objects are positioned or sized.

**Current Approach**:
- Using fixed width and height based on actual size in canvas_json
- No viewport scaling applied
- Objects rendered at exact pixel dimensions from canvas_json

**Impact**: Objects may appear slightly misaligned or sized differently compared to the editor view.

**Files Affected**:
- `published-gallery.view.tsx` - Canvas container dimensions
- `canvas-to-html-renderer.tsx` - Object rendering logic

**Future Solution**: Implement proper viewport-responsive scaling that maintains 1:1 pixel accuracy (see Future Enhancements).

---

## Future Enhancements (Not in Scope)

- **Viewport-Responsive Scaling**: Make objects adjust to viewport while maintaining 1:1 pixel accuracy
  - Calculate proper scale factor that maintains exact object positioning
  - Ensure objects fit viewport while preserving pixel-perfect rendering
  - Handle different screen sizes and aspect ratios
- Settings component for header auto-hide preference
- Gallery unpublish/archive from published view
- Share functionality for published galleries
- Analytics for published galleries

