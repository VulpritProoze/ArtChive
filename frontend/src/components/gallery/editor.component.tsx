import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Palette, Layers, Ungroup, Eye, LayoutTemplate } from 'lucide-react';
import { faSave, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCanvasState } from '@components/common/gallery-feature/hooks/use-canvas-state.hook';
import { galleryService } from '@services/gallery.service';
import type { CanvasObject, ImageObject, Template, SnapGuide } from '@types';
import { LoadingOverlay } from '@components/loading-spinner';
import { CanvasStage } from '@components/common/gallery-feature/canvas-stage.component';
import { Toolbar } from '@components/common/gallery-feature/toolbar.component';
import { LayerPanel } from '@components/common/gallery-feature/layer-panel.panel';
import { PropertiesPanel } from '@components/common/gallery-feature/properties-panel.panel';
import { TemplateLibrary } from '@components/common/gallery-feature/template-library.library';
import { ShapesFloating } from '@components/common/gallery-feature/shapes-floating.component';

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

  const navigate = useNavigate()

  const editorState = useCanvasState({
    galleryId,
    autoSaveInterval: 60000, // 60 seconds
  });

  // Load gallery data on mount
  useEffect(() => {
    if (!galleryId) {
      console.log('[GalleryEditor] No galleryId, skipping load');
      setIsLoading(false);
      return;
    }

    const loadGallery = async () => {
      console.log('[GalleryEditor] Loading gallery:', galleryId);
      try {
        const gallery = await galleryService.getGallery(galleryId);
        console.log('[GalleryEditor] Gallery loaded:', gallery);

        if (gallery.canvas_json) {
          console.log('[GalleryEditor] Initializing canvas with saved data:', {
            objectCount: gallery.canvas_json.objects.length,
            width: gallery.canvas_json.width,
            height: gallery.canvas_json.height,
          });

          // Load existing canvas state
          editorState.initializeState({
            objects: gallery.canvas_json.objects,
            width: gallery.canvas_json.width,
            height: gallery.canvas_json.height,
            background: gallery.canvas_json.background,
          });

          console.log('[GalleryEditor] Canvas initialized successfully');
        } else {
          // Use canvas dimensions from gallery model if no canvas_json exists
          console.log('[GalleryEditor] No canvas_json found, initializing with gallery dimensions:', {
            width: gallery.canvas_width,
            height: gallery.canvas_height,
          });

          editorState.initializeState({
            objects: [],
            width: gallery.canvas_width || 1920,
            height: gallery.canvas_height || 1080,
          });
        }
      } catch (error) {
        console.error('[GalleryEditor] Failed to load gallery:', error);
        toast.error('Failed to load gallery');
      } finally {
        setIsLoading(false);
      }
    };

    loadGallery();
  }, [galleryId]);

  // Generate unique ID helper
  const generateId = () => Math.random().toString(36).substring(2, 15);

  // Add object handlers
  const handleAddRect = useCallback(() => {
    const newRect: CanvasObject = {
      id: generateId(),
      type: 'rect',
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      fill: '#3b82f6',
      stroke: '#1e40af',
      strokeWidth: 2,
      draggable: true,
    };
    editorState.addObject(newRect);
  }, [editorState]);

  const handleAddCircle = useCallback(() => {
    const newCircle: CanvasObject = {
      id: generateId(),
      type: 'circle',
      x: 150,
      y: 150,
      radius: 75,
      fill: '#10b981',
      stroke: '#059669',
      strokeWidth: 2,
      draggable: true,
    };
    editorState.addObject(newCircle);
  }, [editorState]);

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
      width: 200, // Add width for text wrapping
      draggable: true,
    };
    editorState.addObject(newText);
  }, [editorState]);

  const handleAddLine = useCallback(() => {
    const newLine: CanvasObject = {
      id: generateId(),
      type: 'line',
      x: 100,
      y: 100,
      points: [0, 0, 200, 0],
      stroke: '#000000',
      strokeWidth: 2,
      lineCap: 'round', // Add lineCap
      lineJoin: 'round', // Add lineJoin
      draggable: true,
    };
    editorState.addObject(newLine);
  }, [editorState]);

  const handleAddImage = useCallback((url: string) => {
    const newImage: ImageObject = {
      id: generateId(),
      type: 'image',
      x: 100,
      y: 100,
      src: url,
      width: 300,
      height: 200,
      draggable: true,
    };
    editorState.addObject(newImage);
  }, [editorState]);

  const handleAddShape = useCallback((shape: CanvasObject) => {
    editorState.addObject(shape);
    toast.success('Shape added!');
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
    toast.success('Template added!');
  }, [editorState]);

  // Layer management
  const handleToggleVisibility = useCallback((id: string) => {
    const obj = editorState.findObject(id);
    if (obj) {
      editorState.updateObject(id, { visible: !(obj.visible ?? true) });
    }
  }, [editorState]);

  const handleReorder = useCallback((id: string, direction: 'up' | 'down') => {
    const currentIndex = editorState.objects.findIndex(o => o.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= editorState.objects.length) return;

    // This is a simplified version - you'd need to implement array reordering in useCanvasState
    console.log('Reorder:', id, direction);
    toast.info('Reordering coming soon!');
  }, [editorState]);

  // Group/Ungroup handlers
  const handleGroup = useCallback(() => {
    if (editorState.selectedIds.length >= 2) {
      editorState.groupObjects(editorState.selectedIds);
      toast.success('Objects grouped!');
    } else {
      toast.warning('Select at least 2 objects to group');
    }
  }, [editorState]);

  const handleUngroup = useCallback(() => {
    if (editorState.selectedIds.length === 1) {
      const selectedObj = editorState.objects.find(o => o.id === editorState.selectedIds[0]);
      if (selectedObj && selectedObj.type === 'group') {
        editorState.ungroupObject(editorState.selectedIds[0]);
        toast.success('Group ungrouped!');
      } else {
        toast.warning('Selected object is not a group');
      }
    } else {
      toast.warning('Select a single group to ungroup');
    }
  }, [editorState]);

  // Check if group/ungroup actions are available
  const canGroup = editorState.selectedIds.length >= 2;
  const canUngroup = editorState.selectedIds.length === 1 &&
    editorState.objects.find(o => o.id === editorState.selectedIds[0])?.type === 'group';

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, objectId: string) => {
    e.preventDefault();
    const obj = editorState.objects.find(o => o.id === objectId);
    if (obj && obj.type === 'group') {
      setContextMenu({ x: e.clientX, y: e.clientY, objectId });
    }
  }, [editorState.objects]);

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
        toast.success('Gallery saved!');
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

      // Toggle Select Mode with V
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        setEditorMode(prev => prev === 'select' ? 'move' : 'select');
      }

      // Move Mode with M
      if (e.key === 'm' || e.key === 'M') {
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

  // Log render state
  console.log('[GalleryEditor] Rendering', {
    showLayers,
    showProperties,
    isPreviewMode,
    objectCount: editorState.objects.length,
    selectedCount: editorState.selectedIds.length,
    isLoading,
  });

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
      {/* Toolbar */}
      <Toolbar
        onAddText={handleAddText}
        onAddImage={handleAddImage}
        onUndo={editorState.undo}
        onRedo={editorState.redo}
        onTogglePreview={() => setIsPreviewMode(!isPreviewMode)}
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
        onSave={async () => {
          try {
            await editorState.save();
            toast.success('Gallery saved!');
          } catch (error) {
            toast.error('Failed to save gallery');
            console.error('[GalleryEditor] Save error:', error);
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

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar - Toggle Panels */}
        {!isPreviewMode && (
          <div className="bg-base-200 border-r border-base-300 p-2 flex flex-col gap-2 shrink-0">
            <button
              onClick={() => {
                console.log('[GalleryEditor] Toggling layers:', !showLayers);
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
                console.log('[GalleryEditor] Toggling properties:', !showProperties);
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
            editorMode={editorMode}
            isPreviewMode={isPreviewMode}
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
      {contextMenu && (
        <div
          className="absolute bg-base-200 border border-base-300 rounded-lg shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full px-4 py-2 text-left hover:bg-base-300 flex items-center gap-2"
            onClick={() => {
              editorState.ungroupObject(contextMenu.objectId);
              toast.success('Group ungrouped!');
              setContextMenu(null);
            }}
          >
            <Ungroup className="w-4 h-4" />
            Ungroup
          </button>
        </div>
      )}

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
                    toast.success('Gallery saved!');
                    setShowHamburgerMenu(false);
                  } catch (error) {
                    toast.error('Failed to save gallery');
                    console.error('[GalleryEditor] Save error:', error);
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
