import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from '@utils/toast.util';
import { Palette, Layers, Ungroup, Eye, LayoutTemplate, Image, ArrowUp, ArrowDown, MoveUp, MoveDown } from 'lucide-react';
import { faSave, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCanvasState } from '@hooks/gallery/editor/use-canvas-state.hook';
import { galleryService } from '@services/gallery.service';
import type { CanvasObject, ImageObject, Template, SnapGuide } from '@types';
import { LoadingOverlay } from '@components/loading-spinner';
import { CanvasStage } from '@components/common/gallery-feature/editor/canvas-stage.component';
import { Toolbar } from '@components/common/gallery-feature/editor/toolbar.component';
import { LayerPanel } from '@components/common/gallery-feature/editor/layer-panel.panel';
import { PropertiesPanel } from '@components/common/gallery-feature/editor/properties-panel.panel';
import { TemplateLibrary } from '@components/common/gallery-feature/editor/template-library.library';
import { ShapesFloating } from '@components/common/gallery-feature/editor/shapes-floating.component';

type EditorMode = 'pan' | 'move' | 'select';

export default function GalleryEditor() {
  const { galleryId } = useParams<{ galleryId: string }>();
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showShapes, setShowShapes] = useState(false);
  const [showLayers, setShowLayers] = useState(true);
  const [showProperties, setShowProperties] = useState(true);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; objectId: string } | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>('move');
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const shapesButtonRef = useRef<HTMLButtonElement>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const navigate = useNavigate()

  const editorState = useCanvasState({
    galleryId,
    autoSaveInterval: 60000, // 60 seconds
  });

  // Load gallery data on mount
  useEffect(() => {
    if (!galleryId) {
      setIsLoading(false);
      return;
    }

    const loadGallery = async () => {
      try {
        const gallery = await galleryService.getGallery(galleryId);

        if (gallery.canvas_json) {
          // Load existing canvas state
          editorState.initializeState({
            objects: gallery.canvas_json.objects,
            width: gallery.canvas_json.width,
            height: gallery.canvas_json.height,
            background: gallery.canvas_json.background,
          });
        } else {
          // Use canvas dimensions from gallery model if no canvas_json exists
          editorState.initializeState({
            objects: [],
            width: gallery.canvas_width || 1920,
            height: gallery.canvas_height || 1080,
          });
        }
      } catch (error) {
        toast.error('Failed to load gallery', 'An error occurred while loading your gallery');
      } finally {
        setIsLoading(false);
      }
    };

    loadGallery();
  }, [galleryId]);

  // Generate unique ID helper
  const generateId = () => Math.random().toString(36).substring(2, 15);

  // Add object handlers

  const handleAddText = useCallback(() => {
    const newText: CanvasObject = {
      id: generateId(),
      type: 'text',
      x: 100,
      y: 100,
      text: 'Double click to edit',
      fontSize: 24,
      fontFamily: 'Arial',
      fill: '#000000',
      draggable: true,
    };
    editorState.addObject(newText);
  }, [editorState]);

  const handleAddImage = useCallback((url: string) => {
    if (!url || typeof url !== 'string') {
      toast.error('Invalid image URL', 'The uploaded image URL is invalid');
      return;
    }

    // Load the image to get its natural dimensions and maintain aspect ratio
    // Use document.createElement to avoid constructor issues in some environments
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Get natural dimensions
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      
      // Validate that image actually loaded
      if (naturalWidth === 0 || naturalHeight === 0) {
        toast.error('Invalid image', 'The uploaded image is invalid or corrupted');
        return;
      }
      
      // Calculate dimensions maintaining aspect ratio
      // Use a max dimension to prevent images from being too large
      const maxDimension = 500;
      let width = naturalWidth;
      let height = naturalHeight;
      
      // Scale down if image is larger than max dimension
      if (naturalWidth > maxDimension || naturalHeight > maxDimension) {
        const aspectRatio = naturalWidth / naturalHeight;
        if (naturalWidth > naturalHeight) {
          width = maxDimension;
          height = maxDimension / aspectRatio;
        } else {
          height = maxDimension;
          width = maxDimension * aspectRatio;
        }
      }
      
      const newImage: ImageObject = {
        id: generateId(),
        type: 'image',
        x: 100,
        y: 100,
        src: url,
        width: Math.round(width),
        height: Math.round(height),
        draggable: true,
      };
      editorState.addObject(newImage);
      toast.success('Image added', 'Your image has been added to the canvas');
    };
    
    img.onerror = () => {
      toast.error('Failed to load image', 'The image URL could not be loaded. Please check if the image is accessible.');
    };
    
    img.src = url;
  }, [editorState]);

  const handleAddShape = useCallback((shape: CanvasObject) => {
    editorState.addObject(shape);
    toast.success('Shape added', 'Your shape has been added to the canvas');
  }, [editorState]);

  const handleSelectTemplate = useCallback((template: Template) => {
    // Clone template with new ID
    const clonedTemplate = {
      ...template.data,
      id: generateId(),
      children: template.data.children?.map(child => ({
        ...child,
        id: generateId(),
      })),
    };
    editorState.addObject(clonedTemplate);
    toast.success('Template added', 'Your template has been added to the canvas');
  }, [editorState]);

  // Layer management
  const handleToggleVisibility = useCallback((id: string) => {
    const obj = editorState.findObject(id);
    if (obj) {
      editorState.updateObject(id, { visible: !(obj.visible ?? true) });
    }
  }, [editorState]);

  const handleReorder = useCallback((id: string, direction: 'up' | 'down') => {
    editorState.reorderObject(id, direction);
    toast.success(
      `Object moved ${direction === 'up' ? 'forward' : 'backward'}`,
      'Layer order has been updated'
    );
  }, [editorState]);

  // Group/Ungroup handlers
  const handleGroup = useCallback(() => {
    if (editorState.selectedIds.length >= 2) {
      editorState.groupObjects(editorState.selectedIds);
      toast.success('Objects grouped', 'Selected objects have been grouped together');
    } else {
      toast.warning('Selection required', 'Select at least 2 objects to group');
    }
  }, [editorState]);

  const handleUngroup = useCallback(() => {
    if (editorState.selectedIds.length === 1) {
      const selectedObj = editorState.objects.find(o => o.id === editorState.selectedIds[0]);
      if (selectedObj && selectedObj.type === 'group') {
        editorState.ungroupObject(editorState.selectedIds[0]);
        toast.success('Group ungrouped', 'The group has been ungrouped successfully');
      } else {
        toast.warning('Invalid selection', 'Selected object is not a group');
      }
    } else {
      toast.warning('Selection required', 'Select a single group to ungroup');
    }
  }, [editorState]);

  // Check if group/ungroup actions are available
  const canGroup = editorState.selectedIds.length >= 2;
  const canUngroup = editorState.selectedIds.length === 1 &&
    editorState.objects.find(o => o.id === editorState.selectedIds[0])?.type === 'group';

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, objectId: string) => {
    e.preventDefault();
    const obj = editorState.findObject(objectId);
    if (obj) {
      setContextMenu({ x: e.clientX, y: e.clientY, objectId });
    }
  }, [editorState]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts in preview mode
      if (isPreviewMode) return;

      // Check if user is editing text (issue #24 fix)
      // Don't handle shortcuts when focus is on input/textarea elements
      const activeElement = document.activeElement;
      const isEditingText = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement instanceof HTMLElement && activeElement.isContentEditable)
      );

      // Copy (Ctrl+C / Cmd+C)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !isEditingText) {
        e.preventDefault();
        const count = editorState.selectedIds.length;
        if (count > 0) {
          editorState.copyObjects();
          toast.success(`Copied ${count} object(s)`, 'Objects copied to clipboard');
        }
        return;
      }

      // Paste (Ctrl+V / Cmd+V)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !isEditingText) {
        e.preventDefault();
        // Check if clipboard has items before pasting
        const clipboardLength = editorState.clipboard?.length || 0;
        if (clipboardLength > 0) {
          editorState.pasteObjects();
          toast.success(`Pasted ${clipboardLength} object(s)`, 'Objects pasted to canvas');
        }
        return;
      }

      // Duplicate (Ctrl+D / Cmd+D)
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && !isEditingText) {
        e.preventDefault();
        const count = editorState.selectedIds.length;
        if (count > 0) {
          editorState.copyObjects();
          editorState.pasteObjects();
          toast.success(`Duplicated ${count} object(s)`, 'Objects duplicated on canvas');
        }
        return;
      }

      // Don't handle other shortcuts when editing text
      if (isEditingText) return;

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        editorState.undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        editorState.redo();
      }

      // Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        editorState.save();
        toast.success('Gallery saved', 'Your changes have been saved');
      }

      // Group
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !e.shiftKey) {
        e.preventDefault();
        handleGroup();
      }

      // Ungroup
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && e.shiftKey) {
        e.preventDefault();
        handleUngroup();
      }

      // Toggle Select Mode with V (only when Ctrl is NOT pressed)
      if ((e.key === 'v' || e.key === 'V') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setEditorMode(prev => prev === 'select' ? 'move' : 'select');
      }

      // Move Mode with M (only when Ctrl is NOT pressed)
      if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setEditorMode('move');
      }

      // Pan Mode with H (hand tool)
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setEditorMode('pan');
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (editorState.selectedIds.length > 0) {
          e.preventDefault();
          editorState.selectedIds.forEach(id => editorState.deleteObject(id));
        }
      }

      // Layer Ordering Shortcuts (similar to MS Word/Office)
      // Bring to Front: Ctrl+Shift+] or Ctrl+Shift+}
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === ']' || e.key === '}')) {
        e.preventDefault();
        if (editorState.selectedIds.length > 0 && !isEditingText) {
          editorState.selectedIds.forEach(id => editorState.bringToFront(id));
          toast.success('Brought to front', 'Selected object(s) moved to frontmost layer');
        }
      }

      // Send to Back: Ctrl+Shift+[ or Ctrl+Shift+{
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === '[' || e.key === '{')) {
        e.preventDefault();
        if (editorState.selectedIds.length > 0 && !isEditingText) {
          editorState.selectedIds.forEach(id => editorState.sendToBack(id));
          toast.success('Sent to back', 'Selected object(s) moved to backmost layer');
        }
      }

      // Bring Forward: Ctrl+] or Ctrl+}
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === ']' || e.key === '}')) {
        e.preventDefault();
        if (editorState.selectedIds.length > 0 && !isEditingText) {
          editorState.selectedIds.forEach(id => editorState.bringForward(id));
          toast.success('Brought forward', 'Selected object(s) moved one layer forward');
        }
      }

      // Send Backward: Ctrl+[ or Ctrl+{
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === '[' || e.key === '{')) {
        e.preventDefault();
        if (editorState.selectedIds.length > 0 && !isEditingText) {
          editorState.selectedIds.forEach(id => editorState.sendBackward(id));
          toast.success('Sent backward', 'Selected object(s) moved one layer backward');
        }
      }

      // Deselect (Escape) and return to move mode
      if (e.key === 'Escape') {
        e.preventDefault();
        editorState.clearSelection();
        setEditorMode('move');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editorState, isPreviewMode, handleGroup, handleUngroup]);

  // Sidebar resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const newWidth = window.innerWidth - e.clientX;
    const minWidth = 50; // Minimum before hiding
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

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add/remove resize event listeners
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // Selected objects for properties panel (including children within groups)
  const selectedObjects = editorState.selectedIds
    .map(id => editorState.findObject(id))
    .filter((obj): obj is CanvasObject => obj !== null);

  const loadingPhrases = [
    'Loading your masterpiece of a gallery...',
    'Preparing your canvas...',
    'Gathering your artistic elements...',
    'Assembling your creative vision...',
    'Fetching your gallery magic...',
  ];
  const randomPhrase = loadingPhrases[Math.floor(Math.random() * loadingPhrases.length)];

  return (
    <LoadingOverlay isLoading={isLoading} loadingText={randomPhrase}>
      <div
        className="h-screen flex flex-col bg-base-100"
        style={{ cursor: isResizing ? 'ew-resize' : 'default' }}
      >
      {/* Main Content Area */}
      <div 
        className="flex-1 flex flex-col overflow-hidden relative min-h-0"
      >
        {/* Toolbar */}
        <div className="bg-base-200 border-b border-base-300 flex-shrink-0">
          <Toolbar
          onAddText={handleAddText}
          onAddImage={handleAddImage}
          onUndo={editorState.undo}
          onRedo={editorState.redo}
          onToggleGrid={editorState.toggleGrid}
          onToggleSnap={editorState.toggleSnap}
          onGroup={handleGroup}
          onUngroup={handleUngroup}
          onSetMode={setEditorMode}
          onDeselectAll={() => {
            editorState.clearSelection();
            setEditorMode('move');
          }}
          onOpenMenu={() => setShowHamburgerMenu(true)}
          onToggleShapes={() => setShowShapes(!showShapes)}
          onUpdateObject={editorState.updateObject}
          selectedObjects={selectedObjects}
          onSave={async () => {
            try {
              await editorState.save();
              toast.success('Gallery saved', 'Your changes have been saved');
            } catch (error) {
              toast.error('Failed to save gallery', 'An error occurred while saving your gallery');
            }
          }}
          showShapes={showShapes}
          shapesButtonRef={shapesButtonRef}
          canGroup={canGroup}
          canUngroup={canUngroup}
          canUndo={editorState.canUndo}
          canRedo={editorState.canRedo}
          isPreviewMode={isPreviewMode}
          editorMode={editorMode}
          gridEnabled={editorState.gridEnabled}
          snapEnabled={editorState.snapEnabled}
          hasSelection={editorState.selectedIds.length > 0}
          hasUnsavedChanges={editorState.hasUnsavedChanges}
          isSaving={editorState.isSaving}
          />
        </div>

        {/* Canvas and Sidebars Container */}
        <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* Left Sidebar - Toggle Panels */}
        {!isPreviewMode && (
          <div className="bg-base-200 border-r border-base-300 p-2 flex flex-col gap-2 shrink-0">
            <button
              onClick={() => {
                const newShowLayers = !showLayers;
                setShowLayers(newShowLayers);
                // Reset sidebar width if opening and it was collapsed
                if (newShowLayers && sidebarWidth === 0) {
                  setSidebarWidth(320);
                }
              }}
              className={`btn btn-sm ${showLayers ? 'btn-primary' : 'btn-ghost'}`}
              title="Layers"
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const newShowProperties = !showProperties;
                setShowProperties(newShowProperties);
                // Reset sidebar width if opening and it was collapsed
                if (newShowProperties && sidebarWidth === 0) {
                  setSidebarWidth(320);
                }
              }}
              className={`btn btn-sm ${showProperties ? 'btn-primary' : 'btn-ghost'}`}
              title="Properties"
            >
              <Palette className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowTemplates(true)}
              className="btn btn-sm btn-ghost"
              title="Templates Library"
            >
              <LayoutTemplate className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden">
          <CanvasStage
            objects={editorState.objects.filter(obj => obj.visible !== false)}
            selectedIds={isPreviewMode ? [] : editorState.selectedIds}
            onSelect={editorState.selectObjects}
            onUpdateObject={editorState.updateObject}
            zoom={editorState.zoom}
            panX={editorState.panX}
            panY={editorState.panY}
            onZoom={editorState.setZoom}
            onPan={editorState.setPan}
            width={editorState.width}
            height={editorState.height}
            gridEnabled={editorState.gridEnabled}
            snapEnabled={editorState.snapEnabled}
            snapGuides={snapGuides}
            onSnapGuidesChange={setSnapGuides}
            onContextMenu={handleContextMenu}
            onAttachImageToFrame={editorState.attachImageToFrame}
            editorMode={editorMode}
            isPreviewMode={isPreviewMode}
            onTextEdit={setEditingTextId}
            editingTextId={editingTextId}
          />

          {/* Zoom indicator */}
          <div className="absolute bottom-4 right-4 bg-base-200 px-3 py-1 rounded-lg shadow text-sm">
            {Math.round(editorState.zoom * 100)}%
          </div>

          {/* Preview Button - Top Right */}
          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`absolute top-4 right-4 z-40 btn btn-sm ${isPreviewMode ? 'btn-accent' : 'btn-ghost bg-base-200 border-base-300'} shadow-md`}
            title="Toggle Preview Mode"
          >
            <Eye className="w-4 h-4" />
            <span className="ml-1">{isPreviewMode ? 'Exit Preview' : 'Preview'}</span>
          </button>

          {/* Preview mode badge */}
          {isPreviewMode && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-accent text-accent-content px-4 py-2 rounded-lg shadow-lg font-semibold">
              Preview Mode
            </div>
          )}
        </div>

        {/* Right Sidebar - Combined Panels */}
        {!isPreviewMode && (showLayers || showProperties) && sidebarWidth > 0 && (
          <div
            className="shrink-0 border-l border-1 border-base-300 flex flex-col overflow-hidden relative"
            style={{ width: `${sidebarWidth}px` }}
          >
            {/* Resize Handle */}
            <div
              className="absolute left-0 top-0 bottom-0 w-2 -ml-1 cursor-ew-resize z-10 group"
              onMouseDown={handleResizeStart}
            >
              {/* Hover area (invisible but wide for easier grabbing) */}
              <div className="absolute inset-0 w-4 -ml-1" />
              {/* Visual line */}
              <div
                className="absolute left-1 top-0 bottom-0 w-0.5 transition-all"
                style={{
                  backgroundColor: isResizing ? 'hsl(var(--p))' : 'transparent',
                }}
              />
              {/* Hover indicator */}
              <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-1 h-12 bg-primary opacity-0 group-hover:opacity-50 transition-opacity rounded-full" />
            </div>

            {/* Layers Panel */}
            {showLayers && (
              <div className="flex-1 flex flex-col border-b border-base-300 overflow-hidden min-h-0">
                <LayerPanel
                  objects={editorState.objects}
                  selectedIds={editorState.selectedIds}
                  onSelect={editorState.selectObjects}
                  onToggleVisibility={handleToggleVisibility}
                  onDelete={editorState.deleteObject}
                  onReorder={handleReorder}
                  onCopy={() => {
                    const count = editorState.selectedIds.length;
                    if (count > 0) {
                      editorState.copyObjects();
                      toast.success(`Copied ${count} object(s)`, 'Objects copied to clipboard');
                    }
                  }}
                  onPaste={(afterObjectId) => {
                    const clipboardLength = editorState.clipboard?.length || 0;
                    if (clipboardLength > 0) {
                      editorState.pasteObjectsAtPosition(afterObjectId);
                      toast.success(`Pasted ${clipboardLength} object(s)`, 'Objects pasted to canvas');
                    }
                  }}
                  onDetachImage={(frameId) => {
                    editorState.detachImageFromFrame(frameId);
                    toast.success('Image detached', 'The image has been detached from the frame');
                  }}
                  clipboardLength={editorState.clipboard?.length || 0}
                  findObject={editorState.findObject}
                />
              </div>
            )}

            {/* Properties Panel */}
            {showProperties && (
              <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                <PropertiesPanel
                  selectedObjects={selectedObjects}
                  onUpdate={editorState.updateObject}
                />
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Template Library Modal */}
      {showTemplates && (
        <TemplateLibrary
          onSelectTemplate={handleSelectTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* Shapes Floating UI */}
      {showShapes && (
        <ShapesFloating
          onAddShape={handleAddShape}
          onClose={() => setShowShapes(false)}
          buttonRef={shapesButtonRef}
        />
      )}

      {/* Unsaved changes indicator - removed, shown in toolbar instead */}

      {/* Context Menu */}
      {contextMenu && (() => {
        const obj = editorState.findObject(contextMenu.objectId);
        if (!obj) return null;

        const isGroup = obj?.type === 'group';
        const isFrame = obj?.type === 'frame';
        const frameHasImage = isFrame && obj && 'children' in obj && obj.children && obj.children.length > 0;
        
        // Calculate layer position for enabling/disabling buttons
        // Note: Index 0 = back (rendered first), Last index = front (rendered last, appears on top)
        const currentIndex = editorState.objects.findIndex(o => o.id === contextMenu.objectId);
        const isAtFront = currentIndex === editorState.objects.length - 1; // Last index = front
        const isAtBack = currentIndex === 0; // First index = back
        const canMoveUp = currentIndex < editorState.objects.length - 1; // Can move toward front (higher index)
        const canMoveDown = currentIndex > 0; // Can move toward back (lower index)
        
        return (
          <div
            className="absolute bg-base-200 border border-base-300 rounded-lg shadow-lg py-1 z-50 min-w-[200px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {/* Layer Ordering Section */}
            <div className="px-2 py-1">
              <div className="text-xs font-semibold text-base-content/60 uppercase tracking-wide px-2 py-1">
                Layer Order
              </div>
              <button
                className="w-full px-4 py-2 text-left hover:bg-base-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  editorState.bringToFront(contextMenu.objectId);
                  toast.success('Brought to front', 'Object moved to frontmost layer');
                  setContextMenu(null);
                }}
                disabled={isAtFront}
              >
                <MoveUp className="w-4 h-4" />
                Bring to Front
                <span className="ml-auto text-xs text-base-content/50">Ctrl+Shift+]</span>
              </button>
              <button
                className="w-full px-4 py-2 text-left hover:bg-base-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  editorState.bringForward(contextMenu.objectId);
                  toast.success('Brought forward', 'Object moved one layer forward');
                  setContextMenu(null);
                }}
                disabled={!canMoveUp}
              >
                <ArrowUp className="w-4 h-4" />
                Bring Forward
                <span className="ml-auto text-xs text-base-content/50">Ctrl+]</span>
              </button>
              <button
                className="w-full px-4 py-2 text-left hover:bg-base-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  editorState.sendBackward(contextMenu.objectId);
                  toast.success('Sent backward', 'Object moved one layer backward');
                  setContextMenu(null);
                }}
                disabled={!canMoveDown}
              >
                <ArrowDown className="w-4 h-4" />
                Send Backward
                <span className="ml-auto text-xs text-base-content/50">Ctrl+[</span>
              </button>
              <button
                className="w-full px-4 py-2 text-left hover:bg-base-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  editorState.sendToBack(contextMenu.objectId);
                  toast.success('Sent to back', 'Object moved to backmost layer');
                  setContextMenu(null);
                }}
                disabled={isAtBack}
              >
                <MoveDown className="w-4 h-4" />
                Send to Back
                <span className="ml-auto text-xs text-base-content/50">Ctrl+Shift+[</span>
              </button>
            </div>

            {/* Separator */}
            {(isGroup || frameHasImage) && (
              <div className="border-t border-base-300 my-1"></div>
            )}

            {/* Group Actions */}
            {isGroup && (
              <button
                className="w-full px-4 py-2 text-left hover:bg-base-300 flex items-center gap-2"
                onClick={() => {
                  editorState.ungroupObject(contextMenu.objectId);
                  toast.success('Group ungrouped', 'The group has been ungrouped successfully');
                  setContextMenu(null);
                }}
              >
                <Ungroup className="w-4 h-4" />
                Ungroup
              </button>
            )}

            {/* Frame Actions */}
            {isFrame && frameHasImage && (
              <button
                className="w-full px-4 py-2 text-left hover:bg-base-300 flex items-center gap-2"
                onClick={() => {
                  editorState.detachImageFromFrame(contextMenu.objectId);
                  toast.success('Image detached', 'The image has been detached from the frame');
                  setContextMenu(null);
                }}
              >
                <Image className="w-4 h-4" />
                Detach Image
              </button>
            )}
          </div>
        );
      })()}

      {/* Settings Sidebar Overlay */}
      {showHamburgerMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowHamburgerMenu(false)}
        />
      )}

      {/* Settings Sidebar - Matching MainLayout style */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-xs bg-base-100 shadow-2xl z-60 transform transition-transform duration-300 ease-in-out ${
          showHamburgerMenu ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-base-300">
            <h2 className="text-xl font-bold">Menu</h2>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowHamburgerMenu(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Settings Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {/* Save Button */}
              <button
                className="flex hover:cursor-pointer items-center gap-4 w-full p-3 rounded-lg hover:bg-base-200 transition-colors text-left"
                onClick={async () => {
                  try {
                    await editorState.save();
                    toast.success('Gallery saved', 'Your changes have been saved');
                    setShowHamburgerMenu(false);
                  } catch (error) {
                    toast.error('Failed to save gallery', 'An error occurred while saving your gallery');
                  }
                }}
                disabled={editorState.isSaving}
              >
                <FontAwesomeIcon icon={faSave} className="text-lg" />
                <span className="font-medium">{editorState.isSaving ? 'Saving...' : 'Save Gallery'}</span>
              </button>

              {/* Back to Galleries */}
              <button
                className="flex hover:cursor-pointer items-center gap-4 w-full p-3 rounded-lg hover:bg-base-200 transition-colors text-left"
                onClick={() => {
                  if (editorState.hasUnsavedChanges) {
                    if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
                      navigate('/gallery/me')
                    }
                  } else {
                    navigate('/gallery/me')
                  }
                }}
              >
                <FontAwesomeIcon icon={faArrowLeft} className="text-lg" />
                <span className="font-medium">Back to My Galleries</span>
              </button>
            </div>

            {/* Info Section */}
            <div className="mt-6 pt-4 border-t border-base-300">
              <div className="text-sm opacity-70 px-2">
                {editorState.hasUnsavedChanges && (
                  <p className="text-warning font-medium mb-2">• Unsaved changes</p>
                )}
                {editorState.lastSaved && (
                  <p>Last saved: {new Date(editorState.lastSaved).toLocaleTimeString()}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </LoadingOverlay>
  );
}
