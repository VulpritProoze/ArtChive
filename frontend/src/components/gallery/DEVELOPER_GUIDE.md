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

**Status**: ✅ RESOLVED

**Description**: The LayerPanel and PropertiesPanel sidebars were not displaying correctly due to CSS layout issues.

**Resolution**:
The panels are now functioning correctly. If issues persist, ensure:
- State management (showLayers/showProperties) is toggling correctly
- CSS classes for sidebars have proper `display`, `position`, and `z-index`
- Tailwind/DaisyUI classes are properly applied

**Files**:
- `GalleryEditor.tsx` - Main layout structure
- `LayerPanel.tsx` - Layer panel component
- `PropertiesPanel.tsx` - Properties panel component

---

#### 2. Preview Mode Allows Object Movement

**Status**: ✅ RESOLVED

**Description**: In preview mode, objects should be non-interactive (not draggable, not selectable). Previously, users could still move objects around when preview mode was enabled.

**Resolution**:
Fixed in [CanvasStage.tsx:28,49,273,375,392,449,568-569,604,788-789,803,830](frontend/src/components/gallery-editor/CanvasStage.tsx) and [GalleryEditor.tsx:423](frontend/src/components/gallery-editor/GalleryEditor.tsx)

**Implementation**:
1. Added `isPreviewMode?: boolean` prop to `CanvasStageProps` interface
2. Added `isPreviewMode = false` parameter to `CanvasStage` function
3. Passed `isPreviewMode` prop to all object renderers including `CanvasObjectRenderer` and `ImageRenderer`
4. Updated `isDraggable` logic in both renderers:
   ```typescript
   // Objects are only draggable in 'move' mode and not in preview mode
   const isDraggable = !isPreviewMode && editorMode === 'move' && object.draggable !== false;
   ```
5. Passed `isPreviewMode={isPreviewMode}` from `GalleryEditor` to `CanvasStage`

**Result**:
- Objects are now completely non-draggable in preview mode
- Works for all object types (rectangles, circles, text, images, lines, groups)
- Child objects in groups are also non-draggable
- Preview mode provides true read-only view

**Files Modified**:
- `CanvasStage.tsx` - Added isPreviewMode prop and updated draggable logic for all object types
- `GalleryEditor.tsx` - Pass isPreviewMode prop to CanvasStage

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

#### 5. Shifting Object Position in Properties Panel Within Group Causes Deletion

**Status**: ⚠️ CRITICAL - NEEDS FIX

**Description**: When an object is part of a group and its position (X or Y coordinates) is changed via the properties panel, the object disappears from the canvas and gets deleted.

**Impact**: Major data loss bug - users lose objects when trying to position them precisely using the properties panel.

**Steps to Reproduce**:
1. Create a group with multiple objects
2. Select an individual object within the group (using layers panel)
3. Change the X or Y position value in the properties panel
4. Object disappears from canvas and is deleted

**Expected Behavior**:
- Object should move to the new position within the group
- Object should remain visible and part of the group
- Group bounds should update if necessary

**Suspected Root Cause**:
- Position updates for child objects within groups may not correctly handle relative vs absolute coordinates
- Group bounds recalculation may be removing objects outside bounds
- Update logic may be deleting instead of updating the object

**Files to Investigate**:
- `use-canvas-state.hook.ts` - `updateObject` method for group children
- `properties-panel.panel.tsx` - Position update handlers
- Group bounds recalculation logic

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

#### 13. Snap Guide Lines Not Centered for Rotated Objects and Circles

**Status**: ✅ RESOLVED

**Description**: Snap guide lines were not appearing at the visual center of rotated objects and circles. For circles, the guide appeared at the bottom-right instead of the center. For rotated objects, the guide didn't account for the rotation transformation.

**Resolution**:
Fixed in [snapUtils.ts:47-69](frontend/src/utils/snapUtils.ts#L47-L69) and [CanvasStage.tsx:414,770](frontend/src/components/gallery-editor/CanvasStage.tsx)

**Key Changes**:
1. **Circle Handling**: Circles in Konva have their position at the center (not top-left like rectangles). Updated all snap calculations to recognize circles and use their position directly as the center.

2. **Rotation-Aware Center Calculation**: For rotated objects, implemented trigonometric calculations to find where the visual center appears after rotation:
   ```typescript
   // Konva rotates around top-left corner (x, y)
   const angleRad = (currRotation * Math.PI) / 180;
   const centerOffsetX = halfWidth * Math.cos(angleRad) - halfHeight * Math.sin(angleRad);
   const centerOffsetY = halfWidth * Math.sin(angleRad) + halfHeight * Math.cos(angleRad);
   currCenterX = x + centerOffsetX;
   currCenterY = y + centerOffsetY;
   ```

3. **Reverse Calculation**: Added `centerToTopLeft()` helper function to convert snapped center position back to top-left position, accounting for rotation.

4. **Unified Snap Application**: Updated canvas center, grid, and object-to-object snapping to apply both X and Y snaps together, maintaining rotational consistency.

**Files Modified**:
- `snapUtils.ts` - Added rotation parameter, circle detection, and rotation-aware calculations
- `CanvasStage.tsx` - Pass rotation data to snapPosition function

---

#### 14. Text Box Double-Click Editing Not Working

**Status**: ❌ UNRESOLVED

**Description**: Double-clicking a text object should allow in-place editing with an HTML textarea overlay, but it's currently not working as expected.

**Expected Behavior**:
- Double-click any text object to edit
- Textarea should match font size, family, color, and alignment
- Press Enter (without Shift) to save
- Press Escape to cancel
- Click outside (blur) to save

**Current Issue**: The double-click editing functionality is not functioning properly.

**Attempted Solution**:
Previously attempted fix in CanvasStage.tsx with `editingTextId` state and TextEditor overlay component, but requires debugging and proper implementation.

---

#### 15. Object-to-Object Snapping and Rotation Snapping

**Status**: ⚠️ PARTIALLY RESOLVED

**Description**: Object-to-object snapping and rotation snapping are not working as expected. There's no tactile "feeling" that objects have snapped into place.

**Issues**:

1. **Object-to-Object Snapping**: (✅ RESOLVED) When an object's snap guide line aligns with another object's snap guide line, they should "lock" for a few pixels indicating they're aligned. Currently, this locking behavior is missing.

2. **Rotation Snapping**: (❌ UNRESOLVED)  When rotating objects, there's no feedback or "feeling" that the rotation has snapped to specific increments. The rotation feels continuous without any snapping points.

3. **Grid Snapping**: (✅ RESOLVED) This works correctly and provides good feedback.

**Expected Behavior**:
- Objects should "stick" or "lock" when their guide lines align with other objects
- A slight resistance or magnetic effect when objects are near alignment points
- Visual and interaction feedback during rotation snapping (e.g., subtle haptic feel or visual pulse)
- Clear indication when rotation reaches snap points (45°, 90°, etc.)

**Suggested Improvements**:
- Add a small "snap zone" where objects resist movement slightly before snapping
- Provide visual feedback (e.g., brief highlight or pulse) when snap occurs
- Add subtle animation when objects snap into place
- For rotation: add visual indicators at snap angles or temporary angle display

**Files to Investigate**:
- `snapUtils.ts` - Snapping logic and thresholds
- `CanvasTransformer.tsx` - Rotation snapping implementation
- `CanvasStage.tsx` - Drag behavior and snap application

---

#### 16. Objects Draggable in Preview Mode

**Status**: ✅ RESOLVED

**Description**: In preview mode, objects should be non-interactive and non-draggable. Previously, objects could still be moved even when not selected in preview mode, which shouldn't happen.

**Resolution**:
Fixed in [CanvasStage.tsx:28,49,282,399,416,478,634](frontend/src/components/gallery-editor/CanvasStage.tsx)

**Implementation**:
1. Added `isPreviewMode?: boolean` prop to `CanvasStageProps` interface
2. Added `isPreviewMode = false` parameter to `CanvasStage` function
3. Passed `isPreviewMode` prop to all `CanvasObjectRenderer` calls (including child objects in groups)
4. Updated `isDraggable` logic to check for preview mode:
   ```typescript
   // Objects are only draggable in 'move' mode and not in preview mode
   const isDraggable = !isPreviewMode && editorMode === 'move' && object.draggable !== false;
   ```

**Result**:
- When `isPreviewMode={true}` is passed to CanvasStage, all objects become non-draggable
- Users can view the canvas in preview mode without accidentally moving objects
- Works for all object types including groups and their children

**Files Modified**:
- `CanvasStage.tsx` - Added isPreviewMode prop and updated draggable logic

---

#### 17. Resizable Sidebar

**Status**: ✅ IMPLEMENTED

**Description**: The right sidebar (containing Layers and Properties panels) is now resizable via a drag handle on its left border. Users can adjust the sidebar width to their preference or collapse it entirely.

**Implementation**:
Fixed in [GalleryEditor.tsx:27-28,310-354,379-381,488-512](frontend/src/components/gallery-editor/GalleryEditor.tsx)

**Features**:
1. **Drag to Resize**: Click and drag the left border of the sidebar to resize
2. **Width Constraints**:
   - Minimum width: 50px (below this, panels auto-hide)
   - Maximum width: 600px
   - Default width: 320px
3. **Auto-Hide on Collapse**: When resized below 50px, both Layers and Properties panels automatically turn off
4. **Auto-Show on Expand**: When expanding from collapsed state, both panels automatically turn on
5. **Auto-Reset Width**: When manually toggling panels back on (via toolbar buttons) after they were collapsed, sidebar width resets to 320px
6. **Visual Feedback**:
   - Hover indicator shows where to grab
   - Cursor changes to resize cursor during drag
   - Handle highlights when active

**Technical Details**:
```typescript
const [sidebarWidth, setSidebarWidth] = useState(320);
const [isResizing, setIsResizing] = useState(false);

const handleResizeMove = useCallback((e: MouseEvent) => {
  if (!isResizing) return;

  const newWidth = window.innerWidth - e.clientX;
  const minWidth = 50;
  const maxWidth = 600;

  if (newWidth < minWidth) {
    // Auto-hide panels when too small
    setSidebarWidth(0);
    setShowLayers(false);
    setShowProperties(false);
  } else if (newWidth <= maxWidth) {
    setSidebarWidth(newWidth);
    // Re-enable panels if they were hidden
    if (sidebarWidth === 0) {
      setShowLayers(true);
      setShowProperties(true);
    }
  } else {
    setSidebarWidth(maxWidth);
  }
}, [isResizing, sidebarWidth]);
```

**User Benefits**:
- Customize workspace layout
- More canvas space when needed
- Quick collapse/expand functionality
- Smooth, intuitive interaction

**Files Modified**:
- `GalleryEditor.tsx` - Added resize state, handlers, and dynamic sidebar width

#### 18. Text Object Not Included in Group Center Calculation

**Status**: ✅ RESOLVED

- **Issue**: When changing textbox dimensions in the canvas (both X and Y directions), the changes don't affect the group's center calculation
- **Impact**: Snap guides show the center at the wrong position when text objects are resized within groups
- **Location**: `frontend/src/components/common/gallery-feature/utils/snap.util.ts`
- **Root Cause**: The `getGroupVisualBounds()` function doesn't properly handle text objects' width/height
- **Fix Applied**: Added proper text bounds calculation in `getGroupVisualBounds()` - text objects now use actual rendered width/height

#### 19. Line Object X-Direction Not Included in Group Center Calculation

**Status**: ✅ RESOLVED

- **Issue**: Changing the Y direction of a line gets calculated for the group center, but X direction changes do not
- **Impact**: Horizontal line movements/changes don't update group center correctly
- **Location**: `frontend/src/components/common/gallery-feature/utils/snap.util.ts`
- **Root Cause**: Line objects use `points` array instead of width/height, and the bounds calculation only considers Y values properly
- **Fix Applied**: Updated `getGroupVisualBounds()` to calculate line bounds from the `points` array correctly for both X and Y directions

#### 20. Grouped Objects with Lines Disappear
- **Issue**: When grouping objects that include a line, the other objects disappear from the canvas (but remain visible in layers panel). Only the line remains visible on canvas
- **Impact**: Major visual bug - users can't see their grouped objects
- **Location**: Likely in `frontend/src/components/common/gallery-feature/canvas-stage.component.tsx` or group rendering logic
- **Symptoms**:
  - Objects disappear from canvas view
  - Objects still appear in layers panel
  - Line remains visible
  - May be a z-index or rendering order issue
- **Fix Needed**: Investigate group rendering when line objects are children. Check if it's related to line positioning or group bounds calculation causing other children to be rendered off-screen

#### 21. Text Box Snap Guides Not Working - textWidth/textHeight Function Call Error

**Status**: ✅ RESOLVED

- **Issue**: When dragging text objects, snap guides don't appear. Console shows error: `Uncaught TypeError: node.textWidth is not a function at Text2.handleDragMove (canvas-stage.component.tsx:550:39)`
- **Impact**: Text objects cannot use snap guides for alignment
- **Location**: `frontend/src/components/common/gallery-feature/canvas-stage.component.tsx:548-551`
- **Root Cause**: Code calls `node.textWidth?.()` and `node.textHeight?.()` as functions, but in Konva they are properties (getters), not methods
- **Error Count**: 80+ times during a single drag operation
- **Fix Applied**:
  ```typescript
  // Changed lines 548-551 from function calls to property access:
  nodeWidth: node.width,
  nodeHeight: node.height,
  textWidth: (node as any).textWidth,
  textHeight: (node as any).textHeight,
  ```
- **Result**: Text objects now properly display snap guides during drag operations

#### 22. Resizing Text Box in Canvas Changes Font Size

**Status**: ⚠️ NEEDS FIX

**Description**: When a text box is resized using the transformer handles on the canvas, the font size of the text changes proportionally instead of maintaining the same font size and only changing the text box dimensions.

**Impact**: Users cannot create wider/taller text boxes without inadvertently making the text larger or smaller.

**Expected Behavior**:
- Resizing text box should only change the width/height of the bounding box
- Font size should remain constant
- Text should wrap/reflow within the new dimensions
- Only changing the `fontSize` property in properties panel should change text size

**Current Behavior**:
- Dragging transformer handles scales the entire text object including font size
- Text becomes larger when box is expanded
- Text becomes smaller when box is shrunk

**Suspected Root Cause**:
- Transformer applies scale transforms (scaleX/scaleY) to text objects
- Scale is being applied to fontSize instead of just the box dimensions
- Need to separate box dimensions from text rendering

**Possible Solutions**:
1. Disable scaling for text objects on transformer
2. Convert scale changes to width/height changes and reset scale to 1
3. Use `width` property on Konva Text to control wrapping instead of scaling

**Files to Investigate**:
- `canvas-transformer.component.tsx` - Transformer bounds update logic for text
- `canvas-stage.component.tsx` - Text object rendering
- Text object type definition

---

#### 23. Text Box Editable in Preview Mode

**Status**: ⚠️ NEEDS FIX

**Description**: When in preview mode, text boxes can still be edited by double-clicking them. Preview mode should be read-only, preventing any editing interactions including text editing.

**Impact**: Users can accidentally modify text content when viewing the canvas in preview mode, which defeats the purpose of a read-only preview.

**Expected Behavior**:
- Double-clicking a text box in preview mode should not open the text editor
- Text boxes should be completely non-interactive in preview mode
- Preview mode should provide a true read-only view of the canvas

**Current Behavior**:
- Double-clicking a text box in preview mode opens the text editor
- Users can modify text content even when preview mode is enabled

**Suspected Root Cause**:
- Text editing double-click handler does not check for `isPreviewMode` flag
- Text editor component may not be aware of preview mode state

**Possible Solutions**:
1. Add `isPreviewMode` check in the double-click handler for text objects
2. Disable text editing when `isPreviewMode` is true
3. Prevent text editor overlay from appearing in preview mode

**Files to Investigate**:
- `canvas-stage.component.tsx` - Text object double-click handler and text editing logic
- Text editor overlay component (if separate)
- Preview mode state management

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

### Priority Features

#### 1. Resizable Separator Between Layers and Properties Panels

**Description**: Add a draggable separator between the Layers panel and Properties panel in the right sidebar.

**Implementation Notes**:
- Similar to the sidebar resize handle but vertical
- Allow users to adjust the height ratio between panels
- Maintain minimum heights for both panels
- Store user preference in local state

**Files to Modify**:
- `GalleryEditor.tsx` - Add resize logic similar to sidebar resizing

---

#### 2. Expandable Grouped Objects in Layers Panel ✅ **COMPLETED** (not really, still has issues)

**Description**: Users should be able to see and edit individual children within grouped objects directly from the layers panel.

**Features**:
- Display dropdown/expand icon next to group objects
- Show nested children in a tree structure
- Allow selection of individual child objects
- Enable editing of child properties when selected

**Constraints to Solve**:

**a. Child Resize Updates Group Bounds**
- When an individual child object is resized, the parent group's bounding box (width/height) should automatically update
- Need to recalculate group dimensions based on all children positions and sizes
- Update group's `x`, `y`, `width`, `height` to encompass all children

**b. Child Rotation Updates Group Bounds**
- When an individual child is rotated, the group's bounding box should expand/contract accordingly
- Calculate the rotated child's actual space coverage
- Recalculate group bounds to fit the new rotated shape

**Implementation Notes**:
- Add `expanded` state to track which groups are open in layers panel
- Create nested rendering logic for children
- Add callback to update group bounds when children change
- Consider performance for groups with many children

**Files to Modify**:
- `LayerPanel.tsx` - Add tree structure rendering
- `useCanvasState.ts` - Add method to update individual child and recalculate group
- `CanvasStage.tsx` - Handle selection of child objects within groups

---

#### 3. Enhanced Gallery Creation UI ✅ **COMPLETED**

**Description**: Improve the my-galleries component with a better UI and more options when creating new galleries.

**Features**:

**a. Gallery Picture Upload**
- Allow users to upload a cover image when creating a gallery
- Show image preview in gallery card
- Support drag-and-drop upload

**b. Custom Canvas Size Configuration**
- Provide input fields for custom width and height
- Add preset options for common gallery sizes:
  - **Square**: 1080x1080 (Instagram)
  - **Standard**: 1920x1080 (Full HD)
  - **Vertical**: 1080x1920 (Mobile/Story)
  - **Wide**: 2560x1440 (2K)
  - **Ultra-Wide**: 3440x1440 (Ultrawide monitor)
  - **4K**: 3840x2160
  - **Custom**: User-defined dimensions

**c. UI Improvements**
- Modern card-based gallery grid layout
- Better visual hierarchy
- Smooth animations and transitions
- Improved color scheme and typography
- Loading states and skeletons
- Empty state illustration when no galleries exist

**Implementation Notes**:
- Create new `GalleryCreationModal` component
- Add canvas size presets to configuration file
- Update gallery creation API to accept picture and dimensions
- Redesign gallery card component with cover image support

**Files to Create/Modify**:
- `my-galleries.component.tsx` - Redesign UI
- `GalleryCreationModal.tsx` - New modal component
- `gallery.service.ts` - Update create gallery API call
- `backend/gallery/models.py` - Ensure canvas dimensions are stored
- `backend/gallery/serializers.py` - Add picture field validation

---

#### 4. Objects Library Modal ✅ **COMPLETED**

**Description**: Replace individual toolbar buttons for shapes with a unified "Objects" button that opens a modal with categorized object types.

**Features**:

**Modal Categories**:

**1. Shapes**
- **Basic Shapes** (existing):
  - Rectangle
  - Circle
  - Line
- **Advanced Shapes** (new):
  - Arrow (single and double-headed)
  - Triangle
  - Star
  - Pentagon, Hexagon, Octagon
  - Callout/Speech bubble
  - Cloud text box
  - Diamond
  - Heart
  - Rounded rectangle (adjustable corner radius)
- **Custom Shape** (placeholder):
  - Button to create custom shapes (no implementation yet)
  - Show "Coming soon" message
  - Future: Allow users to draw custom vector paths

**2. Templates**
- Move existing template library here
- Same templates currently available
- Better categorization by style/theme

**UI Design**:
- Grid layout with icons/previews for each object type
- Category tabs or sections
- Search/filter functionality
- Hover previews showing what the object looks like
- Click to add object to canvas center

**Implementation Notes**:
- Create new `ObjectsLibraryModal.tsx` component
- Move template selection logic from `TemplateLibrary.tsx`
- Add SVG icons or preview images for each shape type
- Create factory functions for each shape type
- Update toolbar to have single "Objects" button

**Files to Create/Modify**:
- `ObjectsLibraryModal.tsx` - New modal component
- `Toolbar.tsx` - Replace individual shape buttons with "Objects" button
- `GalleryEditor.tsx` - Add modal state and handlers
- `shapeFactory.ts` - New utility file for creating shape objects
- `types/canvas.ts` - Add new shape object type interfaces

---

#### 5. Media Library Panel

**Description**: Add a "Media" button in the left sidebar that displays all of the user's uploaded media files, allowing easy reuse of previously uploaded images.

**Features**:

**Media Storage Structure**:
- All media stored in Cloudinary under: `gallery/editor/{user_id}/`
- **Images**: `gallery/editor/{user_id}/images/` (already implemented)
- **Videos**: `gallery/editor/{user_id}/videos/` (future implementation)

**UI Components**:

**a. Media Library Panel**
- Opens as a modal or side panel when "Media" button is clicked
- Tabs for different media types:
  - **Images** (active/implemented)
  - **Videos** (disabled/coming soon)
- Grid layout showing thumbnails of all uploaded media
- Search and filter functionality
- Sort options (date uploaded, file name, file size)
- Pagination for large media libraries

**b. Media Management**
- Click thumbnail to add image to canvas
- Right-click context menu:
  - Add to canvas
  - Copy URL
  - Delete (with confirmation)
  - View full size
- Drag and drop from media library to canvas
- Show upload date and file size
- Display loading states for thumbnails

**c. Upload Integration**
- "Upload New" button within media library
- Drag and drop zone for bulk uploads
- Upload progress indicators
- Automatic refresh after successful upload

**Backend Requirements**:

**New API Endpoints**:
```python
GET /api/gallery/media/list/          # List all user's uploaded media
  Query params:
  - type: 'image' | 'video'
  - page: number
  - limit: number
  - search: string

DELETE /api/gallery/media/{filename}/  # Delete a media file
  Response: success/error message
```

**Media List Response Structure**:
```json
{
  "count": 45,
  "next": "...",
  "previous": "...",
  "results": [
    {
      "filename": "abc-def-123.jpg",
      "url": "https://res.cloudinary.com/.../abc-def-123.jpg",
      "type": "image",
      "size": 245678,
      "uploaded_at": "2024-01-15T10:30:00Z",
      "thumbnail_url": "https://res.cloudinary.com/.../c_thumb,w_200/.../abc-def-123.jpg"
    }
  ]
}
```

**Backend Implementation**:
- Query Cloudinary API to list files in user's folder
- Use Cloudinary's search API or Admin API
- Generate thumbnail URLs using Cloudinary transformations
- Implement delete endpoint that removes from Cloudinary
- Add pagination support for large media libraries

**Frontend Implementation**:

**Files to Create**:
- `MediaLibraryPanel.tsx` - Main media library component
- `MediaGrid.tsx` - Grid display of media thumbnails
- `MediaItem.tsx` - Individual media item with actions
- `useMediaLibrary.ts` - Hook for fetching and managing media

**Files to Modify**:
- `GalleryEditor.tsx` - Add media panel state and toggle button
- `gallery.service.ts` - Add methods for listing and deleting media
- `Toolbar.tsx` or left sidebar - Add "Media" button

**User Flow**:
1. User clicks "Media" button in left sidebar
2. Media library panel opens showing all uploaded images
3. User can:
   - Browse existing images
   - Search/filter images
   - Click image to add to canvas
   - Upload new images
   - Delete unwanted images
4. Newly uploaded images automatically appear in library
5. Images can be reused across multiple galleries

**Benefits**:
- Reduce redundant uploads (reuse images across galleries)
- Better media organization
- Faster workflow for users
- Reduced storage costs (no duplicates)
- Easy media management

**Implementation Notes**:
- Use Cloudinary's Admin API to list resources by prefix
- Implement caching to reduce API calls
- Add optimistic UI updates for deletions
- Consider implementing folders/tags for organization
- Add bulk selection and deletion
- Show storage usage statistics

**Files to Create/Modify**:
- **Frontend**:
  - `MediaLibraryPanel.tsx` - New component
  - `MediaGrid.tsx` - New component
  - `MediaItem.tsx` - New component
  - `useMediaLibrary.ts` - New hook
  - `GalleryEditor.tsx` - Add media panel integration
  - `gallery.service.ts` - Add media list/delete methods
- **Backend**:
  - `gallery/views.py` - Add MediaListView and MediaDeleteView
  - `gallery/urls.py` - Add new media endpoints

---

#### 6. Copy and Paste Functionality ✅ **COMPLETED**

**Description**: Implement copy and paste functionality for objects and grouped objects using keyboard shortcuts (Ctrl+C / Ctrl+V on Windows, Cmd+C / Cmd+V on Mac) and right-click context menus.

**Features**:

**a. Copy Operation (Ctrl+C / Cmd+C)**
- Copy currently selected object(s) to clipboard
- Works for single objects and grouped objects
- Preserves all object properties (position, size, rotation, styling, etc.)
- Visual feedback when copy is successful (optional toast notification)

**b. Paste Operation (Ctrl+V / Cmd+V)**
- Paste copied object(s) to canvas
- Position pasted object near the original with an offset (e.g., +20px x and y)
- Automatically select the newly pasted object(s)
- Generate new unique IDs for pasted objects
- Preserve relative positions when pasting grouped objects

**c. Multiple Paste Support**
- Allow pasting the same copied object multiple times
- Each paste creates a new instance with offset position
- Subsequent pastes offset from the last pasted position

**Implementation Details**:

**State Management**:
```typescript
// In useCanvasState.ts or GalleryEditor.tsx
const [clipboard, setClipboard] = useState<CanvasObject[]>([]);

const handleCopy = () => {
  const selectedObjects = objects.filter(obj => selectedIds.includes(obj.id));
  if (selectedObjects.length > 0) {
    setClipboard(selectedObjects);
    // Optional: Show toast notification
    toast.info(`Copied ${selectedObjects.length} object(s)`);
  }
};

const handlePaste = () => {
  if (clipboard.length === 0) return;

  const offset = 20; // Offset in pixels
  const pastedObjects = clipboard.map(obj => ({
    ...obj,
    id: generateUniqueId(), // Generate new ID
    x: obj.x + offset,
    y: obj.y + offset,
  }));

  // Add pasted objects to canvas
  pastedObjects.forEach(obj => addObject(obj));

  // Select the newly pasted objects
  selectObjects(pastedObjects.map(obj => obj.id));
};
```

**Keyboard Shortcut Registration**:
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    if (modifier && e.key === 'c') {
      e.preventDefault();
      handleCopy();
    }

    if (modifier && e.key === 'v') {
      e.preventDefault();
      handlePaste();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [selectedIds, clipboard, objects]);
```

**Special Considerations**:

**Grouped Objects**:
- When copying a group, preserve the parent-child relationship
- Children should maintain their relative positions within the group
- Generate new IDs for both the group and all children

**Deep Clone**:
- Ensure deep cloning of objects to avoid reference issues
- Nested properties (like children in groups) must be properly cloned

**Paste Position Logic**:
```typescript
// Smart positioning: paste near original but visible
const calculatePastePosition = (originalX: number, originalY: number, index: number) => {
  const baseOffset = 20;
  const offset = baseOffset * (index + 1); // Increment offset for multiple pastes

  return {
    x: originalX + offset,
    y: originalY + offset
  };
};
```

**User Experience**:
- Clear visual feedback when objects are copied
- Pasted objects are automatically selected for easy manipulation
- Toast notifications (optional):
  - "Copied 1 object" / "Copied 3 objects"
  - "Pasted 1 object" / "Pasted 3 objects"
- No copy/paste when nothing is selected (silent fail)

**Edge Cases to Handle**:
1. **No Selection**: Copy should do nothing if no objects are selected
2. **Empty Clipboard**: Paste should do nothing if clipboard is empty
3. **Canvas Bounds**: Ensure pasted objects don't go off-canvas (optional constraint)
4. **Image Objects**: Preserve image URLs correctly when pasting
5. **Undo/Redo**: Paste should be undoable using the command pattern

**Files to Modify**:
- `GalleryEditor.tsx` - Add keyboard event handlers for copy/paste
- `useCanvasState.ts` - Add clipboard state and copy/paste methods (if using hook)
- May need utility function for deep cloning objects: `utils/objectClone.ts`

**Keyboard Shortcuts Documentation Update**:
Add to existing keyboard shortcuts list:
```typescript
Ctrl+C / Cmd+C         # Copy selected object(s)
Ctrl+V / Cmd+V         # Paste copied object(s)
```

**Implemented Features**:

**Keyboard Shortcuts**:
- `Ctrl+C / Cmd+C` - Copy selected object(s)
- `Ctrl+V / Cmd+V` - Paste copied object(s)
- `Ctrl+D / Cmd+D` - Duplicate (copy + paste in one action)

**Right-Click Context Menus**:
- Right-click on any canvas object → Shows "Copy" option
- Right-click on empty canvas → Shows "Paste" option (when clipboard has items)
- Context menu also shows "Ungroup" for group objects

**Features**:
- Deep cloning of objects with new unique IDs
- Preserves all object properties (position, size, rotation, styling, etc.)
- Works with grouped objects (clones entire group structure)
- Pasted objects offset by 20px from original
- Automatically selects pasted objects
- Toast notifications for user feedback
- Undo/Redo support for paste operations

**Files Modified**:
- `use-canvas-state.hook.ts` - Added `copyObjects()` and `pasteObjects()` methods with deep cloning
- `editor.component.tsx` - Added keyboard shortcuts and context menu handlers
- `canvas-stage.component.tsx` - Added `onCanvasContextMenu` prop and handler

**Future Enhancement**:
- Copy/Paste in layers panel (right-click objects in layers panel to copy/paste)
- Copy to same group when pasting from layers panel context menu
- Cut operation (Ctrl+X / Cmd+X) - copy and delete in one action
- Cross-gallery clipboard (copy from one gallery, paste in another)
- Clipboard history (remember last N copied objects)

---

### Additional Future Features

7. **Image Frame Object** ✅ **COMPLETED**

**Description**: A special "Image Frame" object type that acts as a container for images, allowing users to manage image placement with automatic resizing.

**Implemented Features**:

**Frame Object**:
- Rectangle with dashed border (customizable)
- Distinctive visual appearance (light purple fill by default)
- Placeholder text ("Drop image here") when empty
- Configurable dimensions via properties panel

**Frame Properties** (Properties Panel):
- **Fill Mode**: Choose how images fit in the frame
  - `fit` - Maintains aspect ratio, fits inside frame
  - `fill` - Crops image to fill entire frame
- **Placeholder Text**: Customizable empty state message
- **Dashed Border**: Toggle dashed/solid border
- **Standard Properties**: Position, size, rotation, opacity, stroke color/width
- Visual indicator when image is attached to frame

**Image-Frame Association**:
- `attachImageToFrame(imageId, frameId)` method in canvas state
- Frame stores reference to attached image via `imageId` property
- Automatic image resizing based on fill mode:
  - **Fit mode**: Image scaled to fit inside frame, maintains aspect ratio, centered
  - **Fill mode**: Image scaled to fill frame completely, may crop edges
- Undo/Redo support for frame attachments

**Files Created/Modified**:
- `types/canvas.ts` - Added `FrameObject` interface with properties
- `canvas-stage.component.tsx` - Added frame rendering with Group, Rect, and placeholder Text
- `shape-factory.util.ts` - Added frame to shape definitions and factory
- `use-canvas-state.hook.ts` - Added `attachImageToFrame()` method with fit/fill logic
- `properties-panel.panel.tsx` - Added frame-specific properties section

**How to Use**:
1. Click "Shapes" button in toolbar
2. Select "Image Frame" (🖼 icon)
3. Frame appears on canvas with dashed border
4. Upload an image using the upload image functionality
5. Drag the image over the frame (frame will highlight when hovered)
6. Drop the image on the frame to attach it
7. Image automatically resizes to fit frame while respecting aspect ratio
8. Adjust fill mode and placeholder in properties panel

**Drag-and-Drop Implementation** ✅:
- **Visual Feedback**: Frame highlights when image is dragged over it (darker fill, thicker border, bold placeholder text)
- **Collision Detection**: AABB (Axis-Aligned Bounding Box) overlap detection between dragged image and frames
- **Automatic Attachment**: Image attaches to frame on drop, resizing based on frame's fill mode
- **Image Rendering**: Attached images are rendered inside the frame group and hidden from main canvas
- **Aspect Ratio Preservation**: Images maintain their aspect ratio when using 'fit' mode
- **State Management**: Tracks `draggedImageId` and `hoveredFrameId` for drag state

**Files Modified for Drag-and-Drop**:
- `canvas-stage.component.tsx`:
  - Added `draggedImageId` and `hoveredFrameId` state
  - Added `onAttachImageToFrame` prop
  - Updated `ImageRenderer` with drag handlers and collision detection
  - Added `FrameImageRenderer` component to render attached images inside frame
  - Updated frame rendering to show visual highlight on hover
  - Skip rendering images attached to frames in main canvas

**Future Enhancements** (Not Yet Implemented):
- Context menu: Right-click frame → "Attach Image"
- Replace frame contents by dropping different image
- Detach image from frame
- Frame-to-frame image transfer

**Use Cases**:
- Gallery templates with pre-defined image slots
- Consistent image sizing across multiple frames
- Magazine/poster-style layouts
- Profile picture frames

8. **Video Support**: Add `VideoObject` type and video upload/playback
9. **Export**: Export canvas as PNG/PDF
10. **Collaboration**: Real-time multi-user editing
11. **Version History**: Save multiple versions of canvas
12. **Keyboard Navigation**: Arrow keys to move selected objects
13. **Alignment Tools**: Align left, center, right, distribute
14. **Filters**: Image filters (grayscale, blur, etc.)
15. **Rich Text Editing**: Rich text editor with formatting (bold, italic, underline, etc.)

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
