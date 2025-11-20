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

### 4. Published Gallery View Component ⚠️ FIX IN PROGRESS

**File**: `frontend/src/components/gallery/published-gallery.view.tsx` (NEW)

**Current Status**: 🔴 **CRITICAL BUG - Object Misalignment**

**Issue**: Objects inside groups are misaligned because children are positioned absolutely relative to the container instead of relative to their parent group. See "Known Issues" section below for detailed debugging analysis.

**Route**: `/gallery/:user-id`

**Features**:
  - ✅ Fetch active gallery using new backend endpoint
  - ✅ Convert canvas objects to HTML/CSS and render as a real webpage
  - ✅ All content is static (no interactions, no editing)
  - ⚠️ **Fixed width and height based on actual canvas dimensions from canvas_json** (has alignment issues)
  - ✅ Handle loading and error states
  - ✅ Show error message if multiple active galleries detected (contact staff)
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

#### 4.1 Component Structure - NEW APPROACH

**Current Issue**: Objects are misaligned because:
1. Using responsive scale that changes container size
2. Scale is applied to all positions and dimensions in renderer
3. Container is centered with flex, causing viewport-dependent positioning

**New Approach - 100vw with Fixed Aspect Ratio**:

```typescript
// Calculate height based on canvas aspect ratio and 100vw width
const canvasAspectRatio = gallery.canvas_height / gallery.canvas_width;
const containerWidth = window.innerWidth; // 100vw in pixels
const containerHeight = containerWidth * canvasAspectRatio;

// Calculate scale factor: viewport width / canvas width
// This scale maintains 1:1 object positioning relative to canvas
const scale = containerWidth / gallery.canvas_width;

// Container styles
<div
  style={{
    position: 'relative',
    width: '100vw',
    height: `${containerHeight}px`,
    backgroundColor: gallery.canvas_json?.background || '#ffffff',
    overflow: 'hidden', // Prevent scroll within container
  }}
>
  {/* Render objects with scale factor */}
  {sortedObjects.map((object) => renderCanvasObjectToHTML(object, scale))}
</div>
```

**Key Changes**:
1. **Container width**: Always `100vw` (full viewport width)
2. **Container height**: Calculated dynamically based on canvas aspect ratio
   - Formula: `containerHeight = (100vw) × (canvas_height / canvas_width)`
3. **Scale factor**: `viewport_width / canvas_width`
   - This ensures objects position correctly relative to the scaled canvas
4. **Object positioning**: All x, y, width, height, fontSize, etc. multiplied by scale
5. **No centering with flex**: Container takes full viewport width, objects position absolutely within it
6. **Responsive updates**: Add window resize listener to recalculate containerHeight when viewport changes

**Benefits**:
- Canvas always fills 100% of viewport width
- Aspect ratio is perfectly maintained
- Objects align correctly because scale is consistent
- No horizontal scroll (always 100vw)
- Vertical scroll allowed if canvas is taller than viewport

**Implementation Steps**:
1. Remove `scale` state and responsive scale calculation
2. Calculate `containerHeight` based on aspect ratio: `(window.innerWidth) * (canvas_height / canvas_width)`
3. Calculate `scale` as `window.innerWidth / canvas_width`
4. Set container width to `100vw` and height to `containerHeight`
5. Pass `scale` to renderer (keep existing renderer logic - it already scales correctly!)
6. Add resize listener to update `containerHeight` when viewport width changes
7. Remove centering/flex layout from outer container

#### 4.2 Renderer Utility Updates

**File**: `frontend/src/utils/canvas-to-html-renderer.tsx`

**Current Status**: ⚠️ **CRITICAL BUG IDENTIFIED** - Group children positioning is incorrect!

**Issue Found**: Children of groups are positioned absolutely relative to the container, not relative to their parent group.

**Root Cause**:
- Groups use `position: absolute` (correct for positioning on canvas)
- Children inside groups ALSO use `position: absolute` (INCORRECT - should be relative to group)
- This causes children to be positioned relative to the container, not their parent group
- Result: Objects inside groups appear misaligned

**Example from logs**:
```
[RENDER] GROUP - ID: 15437oasxip {originalPosition: {x: 60, y: -5.9}, ...}
  ↳ GROUP Children (1):
[RENDER] RECT - ID: jy0l5ev3m3g {originalPosition: {x: 10, y: 10}, ...}
```
- Group is at (60, -5.9) on canvas
- Child rect is at (10, 10) relative to group
- **Expected**: Child should render at (60+10, -5.9+10) = (70, 4.1) on canvas
- **Actual**: Child renders at (10, 10) on canvas (ignoring parent position)

**Fix Required**:
1. Groups should use `position: relative` (not absolute) so children position relative to them
2. OR: Children positions should be calculated as `parentX + childX` when rendering
3. Groups themselves should still be positioned absolutely on the canvas

**Additional Issues from Logs**:

1. **Negative Y Coordinates**: Some objects have negative y positions (e.g., `y: -5.9`)
   - This suggests objects may be positioned outside visible canvas bounds
   - Could be due to group bounds calculation in editor
   - **Impact**: Objects may be clipped or positioned incorrectly

2. **Container Height Initialization**: `containerHeight` starts at 0
   - First render happens before `useEffect` sets `containerHeight`
   - Causes initial render with `height: 0px`
   - **Fix**: Initialize `containerHeight` state with calculated value immediately

3. **Scale Calculation Timing**: Scale is calculated on every render
   - Should be memoized or calculated in `useEffect` with resize listener
   - Currently recalculates unnecessarily on every render

4. **GalleryLayout Wrapper**: Container is wrapped in `GalleryLayout`
   - Layout may add padding/margin that affects `100vw` calculation
   - `100vw` includes scrollbar width, which can cause horizontal overflow
   - **Consider**: Use `calc(100vw - scrollbar-width)` or ensure layout doesn't add padding

**Renderer Changes Needed**:

```typescript
case 'group':
case 'gallery-item': {
  const groupObj = object as GroupObject | GalleryItemObject;
  
  // Group container: position relative so children position relative to it
  return (
    <div
      key={object.id}
      style={{
        position: 'absolute', // Position group on canvas
        left: `${object.x * scale}px`,
        top: `${object.y * scale}px`,
        width: `${groupObj.width * scale}px`,
        height: `${groupObj.height * scale}px`,
        // ... other styles
      }}
    >
      {groupObj.children?.map((child) => {
        // Children should position relative to group, not canvas
        // Option 1: Use position: relative (simpler)
        // Option 2: Calculate absolute position (parentX + childX)
        return renderCanvasObjectToHTML(child, scale, {
          parentX: object.x,
          parentY: object.y,
          isChildOfGroup: true
        });
      })}
    </div>
  );
}
```

**Alternative Approach - Calculate Child Positions**:
- Pass parent position to renderer
- When rendering children, calculate: `childAbsoluteX = parentX + childX`
- This maintains absolute positioning but accounts for parent offset

**Recommended Fix**:
1. Change groups to use `position: relative` for children positioning
2. Keep group itself as `position: absolute` for canvas positioning
3. Children inside groups will then position relative to group automatically
4. Update renderer to handle this correctly

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

### 🔴 CRITICAL: Object Misalignment in Published Gallery

**Status**: 🔴 **ACTIVE BUG - REQUIRES IMMEDIATE FIX**

**Description**: Objects converted from canvas are misaligned in the published gallery view. Objects inside groups are positioned incorrectly relative to their parent groups.

**Root Cause Analysis** (from console logs):

1. **Group Children Positioning Bug**:
   - **Problem**: All objects (including children of groups) use `position: absolute` relative to the container
   - **Expected**: Children of groups should position relative to their parent group
   - **Evidence from logs**:
     ```
     [RENDER] GROUP - ID: 15437oasxip {
       originalPosition: {x: 60, y: -5.9},
       scaledPosition: {left: 31, top: -3.04}
     }
       ↳ GROUP Children (1):
     [RENDER] RECT - ID: jy0l5ev3m3g {
       originalPosition: {x: 10, y: 10},
       scaledPosition: {left: 5.16, top: 5.16}
     }
     ```
   - **Issue**: Child rect renders at (5.16, 5.16) on canvas instead of (31+5.16, -3.04+5.16) = (36.16, 2.12)
   - **Impact**: All objects inside groups are misaligned

2. **Negative Y Coordinates**:
   - Some objects have negative y positions (e.g., `y: -5.9`)
   - **Example**: Group `15437oasxip` at `y: -5.9`
   - **Possible causes**:
     - Group bounds calculation in editor allows negative positions
     - Objects positioned outside visible canvas area
   - **Impact**: Objects may be clipped or positioned incorrectly

3. **Container Height Initialization**:
   - `containerHeight` state initializes to `0`
   - First render happens before `useEffect` calculates height
   - **Evidence**: Logs show `containerHeight: 0` on first render
   - **Impact**: Initial render has incorrect container dimensions

4. **Scale Calculation**:
   - Scale calculated on every render: `const scale = window.innerWidth / gallery.canvas_width`
   - Should be memoized or calculated in `useEffect`
   - **Current scale**: `0.5166666666666667` (viewport 558px / canvas 1080px)
   - **Impact**: Unnecessary recalculations, potential timing issues

5. **Container Width with Layout Wrapper**:
   - Container uses `100vw` but is wrapped in `GalleryLayout`
   - Layout may add padding/margin affecting positioning
   - `100vw` includes scrollbar width (can cause horizontal overflow)
   - **Impact**: Objects may be offset by layout padding

**Debugging Data from Logs**:

```
Canvas Dimensions: {
  original: {width: 1080, height: 1080},
  aspectRatio: 1
}
Viewport & Container: {
  viewportWidth: 558,
  viewportHeight: 600,
  containerHeight: 0,  // ⚠️ Should be 558 (558 * 1)
  scale: 0.5166666666666667
}
```

**Object Position Examples**:
- Group `15437oasxip`: Canvas (60, -5.9) → Rendered (31, -3.04) ✅ Correct
- Group `b9s8b97uvk`: Canvas (60, 327.78) → Rendered (31, 169.35) ✅ Correct
- Group `m6efuwywxxo`: Canvas (60, 702.18) → Rendered (31, 362.79) ✅ Correct
- **BUT**: Children inside these groups are NOT offset by parent position ❌

**Files Affected**:
- `frontend/src/utils/canvas-to-html-renderer.tsx` - Group/child positioning logic
- `frontend/src/components/gallery/published-gallery.view.tsx` - Container initialization

**Fix Priority**: 🔴 **HIGH** - Core functionality broken

**Proposed Solutions**:

1. **Fix Group Children Positioning** (Primary Fix):
   - Change groups to use `position: relative` for child positioning context
   - Keep group itself as `position: absolute` for canvas positioning
   - Children will automatically position relative to group

2. **Fix Container Height Initialization**:
   - Calculate `containerHeight` immediately when gallery loads
   - Use `useMemo` or calculate in same `useEffect` as gallery fetch
   - Initialize state with calculated value

3. **Memoize Scale Calculation**:
   - Move scale calculation to `useEffect` with resize listener
   - Store in state or use `useMemo` with dependencies

4. **Handle Layout Wrapper**:
   - Ensure `GalleryLayout` doesn't add padding that affects `100vw`
   - Consider using `calc(100vw - padding)` if needed
   - Or use `width: 100%` of parent instead of `100vw`

**Testing Checklist**:
- [ ] Groups render at correct positions on canvas
- [ ] Children inside groups render at correct positions relative to group
- [ ] Objects with negative coordinates render correctly (may be clipped)
- [ ] Container height is correct on first render
- [ ] Scale calculation is consistent across renders
- [ ] No horizontal overflow from `100vw` + layout padding

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

