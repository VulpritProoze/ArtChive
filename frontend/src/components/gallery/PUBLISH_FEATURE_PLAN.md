# Gallery Publish Feature Implementation Plan

## Overview

Implement a complete gallery publishing system that allows users to publish their galleries, view published galleries at `/gallery/:user-id`, and includes header auto-hide functionality.

## Backend Changes

### 1. New API Endpoint: Get Active Gallery by User ID

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

### 2. Publish Modal Component

**File**: `frontend/src/components/gallery/publish-gallery.modal.tsx` (NEW)

- Modal component that displays list of user's galleries
- Features:
  - List all galleries (from `galleries` prop)
  - Show gallery title, description, status
  - Disable galleries that are already `status === 'active'`
  - Show visual indicator (badge/icon) for active galleries
  - "Publish" button for each non-active gallery
  - Cancel button to close modal
- Props:
  ```typescript
  interface PublishGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    galleries: Gallery[];
    onPublish: (galleryId: string) => Promise<void>;
  }
  ```


### 3. Update Galleries Component

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
      // Handle error (e.g., another gallery is active)
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
  - Display gallery using `CanvasStage` in read-only mode
  - No grid, no transformer, no editing capabilities
  - Full viewport rendering
  - Handle loading and error states
  - Show error message if multiple active galleries detected (contact staff)
- Props/Route params:
  - `userId` from route params
- State:
  - `gallery: Gallery | null`
  - `isLoading: boolean`
  - `error: string | null`
- Error Handling:
  - Use `handleApiError` utility from `@utils/handle-api-error.ts`
  - Set `useResponseMessage = true` to extract error messages from API response
  - This will return response messages (e.g., "Multiple active galleries detected. Please contact ArtChive staff for assistance.") instead of generic status code messages
  - Example implementation:
    ```typescript
    import handleApiError from '@utils/handle-api-error';
    
    try {
      const gallery = await galleryService.getActiveGalleryByUserId(userId);
      setGallery(gallery);
    } catch (error) {
      const errorMessage = handleApiError(error, {}, true); // useResponseMessage = true
      setError(errorMessage);
    }
    ```
- Use `MainLayout` with header auto-hide feature (see below)

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
- This route should be public (no authentication required) or protected based on requirements

## Implementation Details

### Canvas Rendering for Published View

- Use existing `CanvasStage` component with:
  - `isPreviewMode={true}` (disables all interactions)
  - `gridEnabled={false}` (no grid)
  - `editorMode="pan"` or custom read-only mode
  - No transformer (no `selectedIds` or empty array)
  - Canvas dimensions from `gallery.canvas_json`
  - Objects from `gallery.canvas_json.objects`
  - Responsive scaling to fit viewport while maintaining aspect ratio

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
- [ ] Active galleries are disabled in modal
- [ ] Publishing a gallery sets status to 'active'
- [ ] Publishing fails if another gallery is active (backend validation)
- [ ] Published gallery view loads correctly at `/gallery/:user-id`
- [ ] Published gallery view shows canvas in read-only mode
- [ ] No grid or editing tools in published view
- [ ] Header auto-hides after 3 seconds
- [ ] Header reappears on scroll up or mouse move to top
- [ ] Error handling for multiple active galleries
- [ ] Error handling for no active gallery

## Future Enhancements (Not in Scope)

- Settings component for header auto-hide preference
- Gallery unpublish/archive from published view
- Share functionality for published galleries
- Analytics for published galleries

