# Gallery Editor - Developer Guide

## Overview

The Gallery Editor is a full-featured virtual gallery editor built with React-Konva, allowing users to create and manage interactive art galleries with a drag-and-drop canvas interface.

## Architecture

### Technology Stack
- **React-Konva**: Canvas rendering and manipulation
- **TypeScript**: Type safety and better developer experience
- **Django REST Framework**: Backend API
- **Axios**: HTTP client for API calls

### Key Components

```
gallery-editor/
├── CanvasStage.tsx          # Main Konva canvas with zoom/pan
├── CanvasTransformer.tsx    # Object transformation handles
├── Toolbar.tsx              # Editing tools (rect, circle, text, etc.)
├── LayerPanel.tsx           # Layer management sidebar
├── PropertiesPanel.tsx      # Property editing sidebar
├── TemplateLibrary.tsx      # Template selection modal
└── GalleryEditor.tsx        # Main orchestrator component
```

## State Management

### useCanvasState Hook

Located at: `src/hooks/useCanvasState.ts`

This is the central state management hook for the entire editor.

#### State Structure (EditorState)

```typescript
interface EditorState {
  // Canvas content
  objects: CanvasObject[];      // All canvas objects
  width: number;                 // Canvas width (default: 1920)
  height: number;                // Canvas height (default: 1080)
  background?: string;           // Canvas background color

  // UI state
  selectedIds: string[];         // Currently selected object IDs
  clipboard: CanvasObject[];     // Copied objects
  zoom: number;                  // Zoom level (0.2 - 3.0)
  panX: number;                  // Pan X offset
  panY: number;                  // Pan Y offset
  gridEnabled: boolean;          // Show/hide grid
  snapEnabled: boolean;          // Enable/disable snapping
}
```

#### Available Methods

```typescript
// Object manipulation
addObject(obj: CanvasObject): void
updateObject(id: string, updates: Partial<CanvasObject>): void
deleteObject(id: string): void

// Selection
selectObjects(ids: string[]): void
clearSelection(): void

// View control
setZoom(zoom: number): void
setPan(x: number, y: number): void
toggleGrid(): void
toggleSnap(): void

// History
undo(): void
redo(): void

// Persistence
save(): Promise<void>
initializeState(canvasData: CanvasState): void

// Status
isSaving: boolean
lastSaved: Date | null
hasUnsavedChanges: boolean
canUndo: boolean
canRedo: boolean
```

## Canvas Objects

All canvas objects follow a discriminated union pattern with a `type` field.

### Object Types

Located at: `src/types/canvas.ts`

```typescript
type CanvasObject =
  | RectObject      // Rectangle
  | CircleObject    // Circle
  | TextObject      // Text
  | ImageObject     // Image
  | LineObject      // Line
  | GalleryItemObject  // Gallery item (container with children)
```

### Base Properties

All objects extend `BaseCanvasObject`:

```typescript
interface BaseCanvasObject {
  id: string;           // Unique identifier
  type: CanvasObjectType;
  x: number;            // X position
  y: number;            // Y position
  rotation?: number;    // Rotation in degrees
  scaleX?: number;      // X scale factor
  scaleY?: number;      // Y scale factor
  opacity?: number;     // 0-1
  draggable?: boolean;  // Can be dragged
  visible?: boolean;    // Visibility
  name?: string;        // Display name
  zIndex?: number;      // Layer order
}
```

### Adding a New Object Type

1. **Define the interface in `types/canvas.ts`**:
```typescript
export interface MyNewObject extends BaseCanvasObject {
  type: 'mynew';
  customProp: string;
  // ... other properties
}
```

2. **Add to the union type**:
```typescript
export type CanvasObject =
  | RectObject
  | CircleObject
  | MyNewObject  // Add here
  // ...
```

3. **Render in `CanvasStage.tsx`**:
```typescript
{obj.type === 'mynew' && (
  <MyNewComponent
    key={obj.id}
    {...obj}
    onClick={() => onSelectObject(obj.id)}
  />
)}
```

4. **Add tool to `Toolbar.tsx`**:
```typescript
const handleAddMyNew = () => {
  onAddObject({
    id: generateId(),
    type: 'mynew',
    x: 100,
    y: 100,
    customProp: 'default',
  });
};
```

## Undo/Redo System

### Command Pattern

Located at: `src/hooks/useUndoRedo.ts`

All state-changing operations use the command pattern:

```typescript
interface Command {
  execute: () => void;
  undo: () => void;
  description: string;
}
```

### Example: Adding Undo/Redo to a New Operation

```typescript
const myOperation = useCallback((data: any) => {
  const oldState = getCurrentState();

  const command: Command = {
    execute: () => {
      setState(newState);
    },
    undo: () => {
      setState(oldState);
    },
    description: 'My Operation',
  };

  undoRedo.execute(command);
}, [undoRedo]);
```

**Important**: Always use `undoRedo.execute(command)` instead of directly modifying state.

## Auto-Save System

### How It Works

1. **Change Detection**: Any modification to `state.objects` triggers `hasUnsavedChanges = true`
2. **Timer**: A 60-second debounced timer starts
3. **Save**: After 60 seconds, `galleryService.saveGallery()` is called
4. **Manual Save**: User can press `Ctrl+S` to save immediately

### Configuration

```typescript
const editorState = useCanvasState({
  galleryId: 'uuid',
  autoSaveInterval: 60000,  // Change this (in milliseconds)
});
```

### Debugging Auto-Save

Check console logs:
```
[useCanvasState] Auto-save timer effect triggered
[useCanvasState] Starting auto-save timer (60000ms)
[useCanvasState] Auto-save timer fired, calling save()
[useCanvasState] Save called. galleryId: xxx
[galleryService] saveGallery called
```

## Backend API

### Endpoints

Located at: `backend/gallery/views.py`

```python
GET    /api/gallery/                    # List all galleries
POST   /api/gallery/                    # Create gallery
GET    /api/gallery/{id}/               # Get single gallery
PATCH  /api/gallery/{id}/               # Update gallery
DELETE /api/gallery/{id}/               # Soft delete gallery
POST   /api/gallery/media/upload/      # Upload image
```

### Gallery Model

Located at: `backend/gallery/models.py`

```python
class Gallery(models.Model):
    gallery_id = models.UUIDField(primary_key=True)
    title = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=20)  # draft/active/archived
    picture = models.ImageField()
    canvas_json = models.JSONField(null=True, blank=True)  # Canvas state
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    creator = models.ForeignKey(User, on_delete=models.CASCADE)
```

### canvas_json Structure

```json
{
  "width": 1920,
  "height": 1080,
  "background": "#ffffff",
  "objects": [
    {
      "id": "abc123",
      "type": "rect",
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 150,
      "fill": "#ff0000"
    }
    // ... more objects
  ]
}
```

**Note**: Only `CanvasState` is saved (objects, width, height, background). UI state like zoom, pan, and selection are NOT persisted.

## Gallery Service

Located at: `src/services/gallery.service.ts`

```typescript
// Load gallery with canvas data
const gallery = await galleryService.getGallery(galleryId);
if (gallery.canvas_json) {
  editorState.initializeState(gallery.canvas_json);
}

// Save canvas state
await galleryService.saveGallery(galleryId, {
  objects: state.objects,
  width: state.width,
  height: state.height,
  background: state.background,
});

// Upload image
const imageUrl = await galleryService.uploadImage(
  file,
  (progress) => console.log(progress)
);
```

## Image Upload

### Frontend

```typescript
const { upload, progress, isUploading } = useUploadImage();

const handleUpload = async (file: File) => {
  const url = await upload(file);

  if (url) {
    onAddObject({
      id: generateId(),
      type: 'image',
      x: 100,
      y: 100,
      width: 300,
      height: 300,
      src: url,
    });
  }
};
```

### Backend

Located at: `backend/gallery/views.py` → `MediaUploadView`

- Accepts `multipart/form-data` with `image` field
- Validates file type (image only)
- Saves to `gallery_media/{uuid}.{ext}`
- Returns full URL

## Templates

Located at: `src/data/templates.ts`

Templates are pre-configured `GalleryItemObject` instances.

### Structure

```typescript
export const templates: Template[] = [
  {
    id: 'template-1',
    name: 'Classic Frame',
    description: 'Traditional gallery frame layout',
    thumbnail: '/path/to/thumbnail.png',  // Optional
    data: {
      id: generateId(),
      type: 'gallery-item',
      x: 100,
      y: 100,
      width: 300,
      height: 400,
      children: [
        // Child objects
      ],
      background: '#ffffff',
      borderColor: '#333333',
      borderWidth: 2,
    },
  },
];
```

### Adding a New Template

1. Create the template object in `templates.ts`
2. Design the layout with appropriate children
3. Template will automatically appear in `TemplateLibrary` component

## Keyboard Shortcuts

Defined in `GalleryEditor.tsx`:

```typescript
Ctrl+Z / Cmd+Z         # Undo
Ctrl+Y / Cmd+Shift+Z   # Redo
Ctrl+S / Cmd+S         # Save
Delete / Backspace     # Delete selected
Ctrl+C / Cmd+C         # Copy
Ctrl+V / Cmd+V         # Paste
Ctrl+D / Cmd+D         # Duplicate
Escape                 # Clear selection
P                      # Toggle preview mode
G                      # Toggle grid
```

### Adding a New Shortcut

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
      e.preventDefault();
      // Your custom action
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [/* dependencies */]);
```

## Zoom and Pan

### Zoom

- **Mouse Wheel**: Zoom in/out
- **Range**: 0.2x to 3.0x
- **Increment**: 0.1x per scroll

### Pan

- **Space + Drag**: Pan the canvas
- **Or**: Click empty area and drag

### Implementation

Located in `CanvasStage.tsx`:

```typescript
const handleWheel = (e: any) => {
  e.evt.preventDefault();
  const stage = e.target.getStage();
  const oldScale = zoom;
  const pointer = stage.getPointerPosition();

  // Calculate zoom point
  const mousePointTo = {
    x: (pointer.x - panX) / oldScale,
    y: (pointer.y - panY) / oldScale,
  };

  const direction = e.evt.deltaY > 0 ? -1 : 1;
  const newScale = Math.max(0.2, Math.min(3, oldScale + direction * 0.1));

  onZoom(newScale);

  // Adjust pan to zoom toward mouse
  onPan(
    pointer.x - mousePointTo.x * newScale,
    pointer.y - mousePointTo.y * newScale
  );
};
```

## Grid and Snapping

### Grid

- **Toggle**: Press `G` or click grid button
- **Size**: 20px (configurable in `CanvasGrid` component)
- **Visual**: Light gray lines

### Snapping

- **Toggle**: Click snap button in toolbar
- **Snap to Grid**: Objects snap to 20px grid
- **Snap to Objects**: Objects snap to edges of nearby objects (within 5px)

### Utility Functions

Located at: `src/utils/snapUtils.ts`:

```typescript
snapPosition(
  x: number,
  y: number,
  snapEnabled: boolean,
  gridSize: number,
  objects: CanvasObject[],
  currentId: string
): { x: number; y: number; guides: SnapGuide[] }
```

## Debugging

### Enable Comprehensive Logging

All major operations include console logging with prefixes:

- `[GalleryIndex]` - Gallery list component
- `[GalleryEditor]` - Main editor component
- `[useCanvasState]` - State management hook
- `[galleryService]` - API service calls

### Common Issues

#### 1. Objects Not Loading

**Symptoms**: Canvas is blank when opening saved gallery

**Check**:
```javascript
// Console should show:
[GalleryEditor] Loading gallery: {id}
[GalleryEditor] Initializing canvas with saved data
[useCanvasState] initializeState called with: {...}
```

**Fix**: Ensure `editorState.initializeState()` is called in the `loadGallery` effect

#### 2. Auto-Save Not Working

**Symptoms**: Changes not being saved

**Check**:
```javascript
// Console should show:
[useCanvasState] Objects changed, marking as unsaved
[useCanvasState] Starting auto-save timer (60000ms)
[useCanvasState] Auto-save timer fired
```

**Common causes**:
- `galleryId` is undefined (check route params)
- `hasUnsavedChanges` not being set (check state.objects dependency)

#### 3. TypeScript Errors

**Common issues**:
- Discriminated union not properly typed → Add `as CanvasObject` assertion
- Missing properties → Check `BaseCanvasObject` interface
- Import errors → Verify path aliases in `tsconfig.app.json` and `vite.config.ts`

## Testing

### Manual Testing Checklist

- [ ] Create new gallery
- [ ] Add each object type (rect, circle, text, line, image)
- [ ] Transform objects (move, resize, rotate)
- [ ] Delete objects
- [ ] Undo/redo operations
- [ ] Copy/paste objects
- [ ] Insert template
- [ ] Upload image
- [ ] Save (Ctrl+S)
- [ ] Reload page - objects should persist
- [ ] Zoom in/out
- [ ] Pan canvas
- [ ] Toggle grid
- [ ] Test snapping
- [ ] Layer management (reorder, hide, delete)
- [ ] Edit properties panel
- [ ] Preview mode

### Network Testing

Open DevTools → Network tab and verify:

1. **Load**: `GET /api/gallery/{id}/` returns `canvas_json`
2. **Save**: `PATCH /api/gallery/{id}/` sends `canvas_json` payload
3. **Upload**: `POST /api/gallery/media/upload/` returns image URL

## Known Issues

### 🐛 Critical Issues

#### 1. Layers and Properties Panel Not Appearing Properly

**Status**: 🔴 Unresolved

**Description**: The LayerPanel and PropertiesPanel sidebars do not display correctly. They may be hidden, overlapping, or not rendering at all.

**Potential Causes**:
- CSS layout issues (z-index, positioning)
- State management (showLayers/showProperties state not propagating)
- Component mounting issues

**Investigation Steps**:
```javascript
// Check if state is toggling correctly
console.log('showLayers:', showLayers);
console.log('showProperties:', showProperties);

// Check if components are rendering
// Add to LayerPanel.tsx and PropertiesPanel.tsx
console.log('[LayerPanel] Rendering');
console.log('[PropertiesPanel] Rendering');
```

**Suggested Fix**:
- Verify CSS classes for sidebars have proper `display`, `position`, and `z-index`
- Check that conditional rendering logic is correct in `GalleryEditor.tsx`
- Ensure Tailwind/DaisyUI classes are properly applied

**Files to Check**:
- `GalleryEditor.tsx` - Main layout structure
- `LayerPanel.tsx` - Layer panel component
- `PropertiesPanel.tsx` - Properties panel component

---

#### 2. Preview Mode Allows Object Movement

**Status**: 🔴 Unresolved

**Description**: In preview mode, objects should be non-interactive (not draggable, not selectable). Currently, users can still move objects around when preview mode is enabled.

**Expected Behavior**:
- Preview mode = read-only view
- Objects should have `draggable={false}`
- Click events should not select objects
- Transformer should be hidden

**Current Behavior**:
- Objects remain interactive in preview mode
- Users can drag, select, and transform objects

**Suggested Fix**:

In `CanvasStage.tsx`, pass `isPreviewMode` prop and disable interactions:

```typescript
// CanvasStage.tsx
interface CanvasStageProps {
  // ... other props
  isPreviewMode?: boolean;
}

export function CanvasStage({ isPreviewMode, ...props }: CanvasStageProps) {
  return (
    <Stage>
      <Layer>
        {objects.map(obj => {
          if (obj.type === 'rect') {
            return (
              <Rect
                key={obj.id}
                draggable={!isPreviewMode && obj.draggable}
                onClick={isPreviewMode ? undefined : handleClick}
                onDragEnd={isPreviewMode ? undefined : handleDragEnd}
                {...obj}
              />
            );
          }
          // ... repeat for other object types
        })}

        {/* Hide transformer in preview mode */}
        {!isPreviewMode && <CanvasTransformer />}
      </Layer>
    </Stage>
  );
}
```

In `GalleryEditor.tsx`, pass the prop:

```typescript
<CanvasStage
  isPreviewMode={isPreviewMode}
  // ... other props
/>
```

**Files to Modify**:
- `CanvasStage.tsx` - Add preview mode logic
- `GalleryEditor.tsx` - Pass isPreviewMode prop

---

#### 3. Canvas Panning Only Works Outside Canvas Area

**Status**: ✅ RESOLVED

**Description**: Users expect to pan the canvas by dragging anywhere on the canvas background. Currently, panning only works when the mouse is dragged outside the canvas boundaries.

**Expected Behavior**:
- Click and drag on empty canvas area = pan
- OR Space + drag anywhere = pan
- Smooth panning within canvas bounds

**Resolution**:
Fixed in [CanvasStage.tsx:72-115](frontend/src/components/gallery-editor/CanvasStage.tsx#L72-L115)

The issue was that the mouse down handler only detected clicks on the Stage itself (`e.target === e.target.getStage()`), but not on the white background Rect.

**Fix Applied**:

```typescript
const handleMouseDown = (e: any) => {
  // Detect clicks on empty canvas (Stage OR white background Rect)
  const clickedOnEmpty =
    e.target === e.target.getStage() ||
    (e.target.getClassName() === 'Rect' && e.target.attrs.fill === 'white');

  if (clickedOnEmpty) {
    setIsPanning(true);
    const pos = e.target.getStage().getPointerPosition();
    lastPanPos.current = { x: pos.x, y: pos.y };
    onSelect([]); // Deselect all objects
  }
};

const handleMouseMove = (e: any) => {
  if (!isPanning) return;

  const stage = stageRef.current;
  if (!stage) return;

  const pos = stage.getPointerPosition();
  if (!pos) return;

  const dx = pos.x - lastPanPos.current.x;
  const dy = pos.y - lastPanPos.current.y;

  onPan(panX + dx, panY + dy);
  lastPanPos.current = { x: pos.x, y: pos.y };
};

const handleMouseUp = () => {
  setIsPanning(false);
};

<Stage
  onMouseDown={handleMouseDown}
  onMouseMove={handleMouseMove}
  onMouseUp={handleMouseUp}
  onMouseLeave={handleMouseUp}  // Stop panning when mouse leaves canvas
  // ... other props
>
```

**Key Changes**:
1. Added check for white background Rect clicks: `e.target.getClassName() === 'Rect' && e.target.attrs.fill === 'white'`
2. Added `onMouseLeave` to stop panning when cursor leaves canvas
3. Added debug logging to help troubleshoot
4. Added null check for `getPointerPosition()` return value

---

#### 4. Grid Snapping Lacks Visual Feedback

**Status**: ✅ RESOLVED

**Description**: When snapping is enabled, users now see visual guide lines showing where objects are snapping to during drag operations.

**Features Implemented**:
- **Grid Snapping**: Objects snap to 10px grid with visual blue dashed guide lines
  - Object centers snap to grid points (priority)
  - Object corners snap to grid if center doesn't align
  - Works with all object types including circles
- **Canvas Center Snapping**: Objects snap to horizontal and vertical center of canvas
- **Object-to-Object Snapping**: Objects snap to other objects' edges and centers
  - Left/right edge alignment
  - Top/bottom edge alignment
  - Center-to-center alignment (both horizontal and vertical)
- Guide lines appear during drag and disappear on release

**Current Behavior**:
- Blue dashed crisscrossing lines appear when dragging objects
- Snaps to grid, canvas center, and other object edges/centers
- Visual feedback shows exactly where objects are aligning
- All object types (rectangles, circles, text, images, lines) snap correctly

**Implementation Details**:

The snapping system in [snapUtils.ts](frontend/src/utils/snapUtils.ts) uses a priority system:
1. **Canvas center** (highest priority) - 10px threshold
2. **Grid snapping** - 10px grid with 10px threshold
3. **Object alignment** - Edges and centers with 10px threshold

All snapping types generate visual guide lines that render in [CanvasStage.tsx:176-195](frontend/src/components/gallery-editor/CanvasStage.tsx#L176-L195).

**Snapping Modes**:
- **Grid + Snap enabled**: All snapping modes active
- **Snap only**: Canvas center and object alignment (no grid)
- **Grid only**: Grid snapping without visual guides
- **Both disabled**: No snapping

**Files Modified**:
- [snapUtils.ts:61-100](frontend/src/utils/snapUtils.ts#L61-L100) - Enhanced grid snapping to prioritize center alignment
- [snapUtils.ts:44-59](frontend/src/utils/snapUtils.ts#L44-L59) - Canvas center snapping
- [snapUtils.ts:104-161](frontend/src/utils/snapUtils.ts#L104-L161) - Object-to-object edge and center alignment
- [CanvasStage.tsx:262-301](frontend/src/components/gallery-editor/CanvasStage.tsx#L262-L301) - Updated drag handlers with special handling for circles
- [CanvasStage.tsx:492-526](frontend/src/components/gallery-editor/CanvasStage.tsx#L492-L526) - Updated ImageRenderer drag handlers

---

### 🟡 Minor Issues

#### 5. Rotation Performance Issues

**Status**: ✅ RESOLVED

**Description**: Rotation slider in properties panel had clunky behavior with frequent interruptions and a "disabled" cursor appearing during drag.

**Issue**: Every slider `onChange` event was calling `onUpdate`, which triggered the undo/redo system and caused expensive state updates during continuous dragging.

**Fix Applied** in [PropertiesPanel.tsx:45-54](frontend/src/components/gallery-editor/PropertiesPanel.tsx#L45-L54):

The slider now uses a two-phase update pattern:
1. **During drag** (`onInput`): Updates only local state for smooth visual feedback
2. **After drag** (`onChange`, `onMouseUp`, `onTouchEnd`): Commits to actual state and undo history

```typescript
const [isDragging, setIsDragging] = useState(false);

const handleSliderChange = (key: string, value: any) => {
  // Only update local state while dragging
  setLocalValues((prev) => ({ ...prev, [key]: value }));
};

const handleSliderCommit = (key: string, value: any) => {
  // Commit to actual state when done dragging
  onUpdate(obj.id, { [key]: value });
  setIsDragging(false);
};
```

**Benefits**:
- Smooth, uninterrupted slider dragging
- Reduced canvas rerenders during rotation
- Only one undo/redo entry per rotation operation
- Works for both rotation and opacity sliders

---

#### 6. No Loading State for Image Objects

**Description**: When images are loading on the canvas, there's no loading indicator or placeholder.

**Suggested Fix**: Use `use-image` hook's loading state to show skeleton.

---

#### 7. Undo/Redo History Not Limited

**Description**: History stack could grow infinitely, causing memory issues.

**Status**: Partially addressed (maxHistorySize=50 in useUndoRedo)

---

#### 8. No Confirmation on Gallery Delete

**Description**: While there is a browser confirm dialog, it could be improved with a custom modal.

**Suggested Enhancement**: Create a custom confirmation modal with "Are you sure?" message and styling.

---

#### 9. Grouped Objects Cannot Be Rescaled

**Status**: ✅ RESOLVED

**Description**: When a group object is selected, the transformer does not allow rescaling. Users cannot resize grouped objects.

**Resolution**:
Fixed in [CanvasTransformer.tsx:104-117](frontend/src/components/gallery-editor/CanvasTransformer.tsx#L104-L117)

The transformer now properly handles group scaling:
- Uses average of scaleX and scaleY to maintain aspect ratio
- Updates group width and height based on scale
- Resets scale values to 1 after baking into dimensions

```typescript
// For groups, maintain aspect ratio by using the average scale
if (currentObject && currentObject.type === 'group') {
  const avgScale = (scaleX + scaleY) / 2;
  updates.scaleX = avgScale;
  updates.scaleY = avgScale;

  updates.width = Math.max(5, currentObject.width * avgScale);
  updates.height = Math.max(5, currentObject.height * avgScale);

  updates.scaleX = 1;
  updates.scaleY = 1;
}
```

---

#### 10. Grouped Objects Cannot Be Moved

**Status**: ✅ RESOLVED

**Description**: Grouped objects cannot be dragged/moved as a unit. Only individual objects within the group can be moved.

**Resolution**:
Fixed in [CanvasStage.tsx:601-717](frontend/src/components/gallery-editor/CanvasStage.tsx#L601-L717)

The key fix was setting `listening={false}` on all child elements within groups. This makes children non-interactive, so only the parent group handles mouse/touch events.

```typescript
case 'group':
  return (
    <Group
      id={object.id}
      draggable={object.draggable !== false}
      onClick={onSelect}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      {object.children?.map((child) => {
        // Render children with listening={false}
        return <ChildShape listening={false} {...child} />;
      })}
    </Group>
  );
```

**How It Works**:
- Parent Group is draggable and handles all interactions
- Children render visually but don't capture events (`listening={false}`)
- Entire group moves as one unit
- To move individual objects, user must ungroup first (right-click → ungroup)

---

#### 11. Template Objects Should Function Like Groups

**Status**: ✅ RESOLVED

**Description**: Template objects (gallery-item type) should behave like grouped objects, or ideally, be converted to use the group object type for consistency.

**Resolution**:
Fixed in [templates.ts](frontend/src/data/templates.ts)

All templates have been converted from `type: 'gallery-item'` to `type: 'group'`. This unifies the codebase and allows templates to automatically inherit all group functionality:
- Drag and move as a unit
- Rescale with aspect ratio preservation
- Ungroup via right-click context menu
- Select in both pan and select modes

**Changes Made**:
- Changed all 5 templates from `gallery-item` to `group`
- Removed unnecessary `background`, `borderColor`, `borderWidth` properties (not part of GroupObject interface)
- Templates now use the same rendering and interaction logic as manually created groups

**Note**: The `gallery-item` case in CanvasStage.tsx can now be removed if no longer needed, or kept for backward compatibility with existing saved galleries.

---

#### 12. Grid Mode Should Be Enabled By Default

**Status**: ✅ RESOLVED

**Description**: Grid should be visible by default when opening the editor to help with alignment.

**Resolution**:
Fixed in [useCanvasState.ts:49](frontend/src/hooks/useCanvasState.ts#L49)

Changed default state from `gridEnabled: false` to `gridEnabled: true`:

```typescript
const [state, setState] = useState<EditorState>({
  objects: [],
  width: 1920,
  height: 1080,
  selectedIds: [],
  clipboard: [],
  zoom: 1,
  panX: 0,
  panY: 0,
  gridEnabled: true,   // ✓ Now true by default
  snapEnabled: true,
  ...initialState,
});
```

Now when users open the gallery editor, the grid will be visible immediately to help with object alignment and positioning.

---

#### 13. Deselect All Should Also Disable Select Tool

**Status**: 🔴 Unresolved

**Description**: When clicking the "Deselect All" button (X icon), it should also exit select mode and return to pan mode.

**Expected Behavior**:
- Click deselect button → clears selection AND exits select mode
- ESC key → clears selection AND exits select mode
- This provides a quick way to return to default pan/move state

**Suggested Fix**:

In `GalleryEditor.tsx`:
```typescript
const handleDeselectAll = () => {
  editorState.clearSelection();
  setIsSelectMode(false);
};
```

Then pass `handleDeselectAll` instead of `editorState.clearSelection` to Toolbar.

**Files to Modify**:
- `GalleryEditor.tsx` - Create combined handler
- Update keyboard shortcut handler for ESC key

---

#### 14. Text Box Double-Click Editing Not Working

**Status**: 🔴 Unresolved

**Description**: Double-clicking a text object should allow in-place editing. Currently, users cannot edit text directly on the canvas.

**Expected Behavior**:
- Double-click text object → converts to editable input/textarea
- User types new text
- Click outside or press Enter → commits changes

**Suggested Implementation**:

Use Konva's built-in text editing or create a custom HTML overlay:

```typescript
// In CanvasStage.tsx
const handleTextDblClick = (textObj: TextObject) => {
  // Create textarea overlay
  const textarea = document.createElement('textarea');
  textarea.value = textObj.text;
  // Position it over the text object
  // On blur/enter, update the text object
};
```

**Additional Issues**:
- Text box properties panel may also need improvements
- Font selection, alignment, etc. should be easily accessible

**Files to Modify**:
- `CanvasStage.tsx` - Add double-click handler for text objects
- `PropertiesPanel.tsx` - Enhance text editing controls

---

#### 15. Object-to-Object Grid Snapping Not Implemented

**Status**: 🔴 Unresolved

**Description**: Grid snapping should work between objects, not just to the canvas grid. When moving a rectangle next to another rectangle, snapping should trigger to align their edges.

**Expected Behavior**:
- Drag object A near object B → edges snap together
- Visual guide lines show alignment
- Works for all edge combinations (left-to-left, right-to-right, top-to-top, etc.)

**Note**: Developer thought this was already fixed, but it may need reimplementation or verification.

**Suggested Enhancement**:

In `snapUtils.ts`, ensure object-to-object snapping is properly detecting and aligning edges:

```typescript
// Check all objects for edge alignment
objects.forEach(otherObj => {
  if (otherObj.id === currentId) return;

  const threshold = 5; // px

  // Left edge to left edge
  if (Math.abs(x - otherObj.x) < threshold) {
    snappedX = otherObj.x;
    guides.push({ type: 'vertical', position: otherObj.x });
  }

  // Right edge to right edge
  if (Math.abs((x + width) - (otherObj.x + otherObj.width)) < threshold) {
    snappedX = otherObj.x + otherObj.width - width;
    guides.push({ type: 'vertical', position: otherObj.x + otherObj.width });
  }

  // Similar for top/bottom edges
});
```

**Files to Modify**:
- `snapUtils.ts` - Add or verify object-to-object edge snapping logic
- Test with multiple objects on canvas

---

## Performance Considerations

### Canvas Objects

- **Limit**: Try to keep under 100 objects for smooth performance
- **Images**: Use appropriate image sizes (not too large)
- **Transforms**: Konva caching is enabled for complex shapes

### State Updates

- **Avoid**: Directly mutating state
- **Use**: Immutable updates with spread operators
- **Batch**: Multiple updates when possible

### Auto-Save

- **Debounced**: 60 seconds prevents excessive API calls
- **Cancel**: Timer is cleared on unmount

## Future Enhancements

Potential features to add:

1. **Video Support**: Add `VideoObject` type (currently excluded)
2. **Layers Panel**: Group objects into named layers
3. **Export**: Export canvas as PNG/PDF
4. **Collaboration**: Real-time multi-user editing
5. **Version History**: Save multiple versions of canvas
6. **Asset Library**: Reusable shapes and images
7. **Keyboard Navigation**: Arrow keys to move selected objects
8. **Alignment Tools**: Align left, center, right, distribute
9. **Filters**: Image filters (grayscale, blur, etc.)
10. **Text Editing**: Rich text editor with formatting

## Useful Resources

- [Konva Documentation](https://konvajs.org/docs/)
- [React-Konva Guide](https://konvajs.org/docs/react/)
- [Canvas State Pattern](https://refactoring.guru/design-patterns/command)
- [TypeScript Discriminated Unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)

## Need Help?

When asking for help, provide:

1. **Console logs** (include all `[GalleryEditor]` and `[useCanvasState]` logs)
2. **Network tab** (show API requests/responses)
3. **Steps to reproduce**
4. **Expected vs actual behavior**
5. **Canvas JSON** (if relevant)

## Changelog

### v1.0.0 (Initial Release)
- Basic canvas with object manipulation
- Undo/redo system
- Auto-save functionality
- Template library
- Image upload
- Grid and snapping
- Layer panel
- Properties panel
- Zoom and pan
- Keyboard shortcuts
