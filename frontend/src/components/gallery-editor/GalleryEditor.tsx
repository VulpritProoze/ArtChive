import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Layout, Palette, Layers, Ungroup } from 'lucide-react';
import { useCanvasState } from '@hooks/useCanvasState';
import { galleryService } from '@services/gallery.service';
import type { CanvasObject, ImageObject, Template, SnapGuide } from '@types';
import { snapPosition } from '@utils/snapUtils';
import { CanvasStage } from './CanvasStage';
import { Toolbar } from './Toolbar';
import { LayerPanel } from './LayerPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { TemplateLibrary } from './TemplateLibrary';

export function GalleryEditor() {
  const { galleryId } = useParams<{ galleryId: string }>();
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showLayers, setShowLayers] = useState(true);
  const [showProperties, setShowProperties] = useState(true);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; objectId: string } | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(true);

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
          console.log('[GalleryEditor] No canvas_json found, using default state');
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
    const obj = editorState.objects.find(o => o.id === id);
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

      // Toggle Select Mode
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        setIsSelectMode(true);
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (editorState.selectedIds.length > 0) {
          e.preventDefault();
          editorState.selectedIds.forEach(id => editorState.deleteObject(id));
        }
      }

      // Deselect (Escape)
      if (e.key === 'Escape') {
        e.preventDefault();
        editorState.clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editorState, isPreviewMode, handleGroup, handleUngroup]);

  // Selected objects for properties panel
  const selectedObjects = editorState.objects.filter(obj =>
    editorState.selectedIds.includes(obj.id)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // Log render state
  console.log('[GalleryEditor] Rendering', {
    showLayers,
    showProperties,
    isPreviewMode,
    objectCount: editorState.objects.length,
    selectedCount: editorState.selectedIds.length,
  });

  return (
    <div className="h-screen flex flex-col bg-base-100">
      {/* Toolbar */}
      <Toolbar
        onAddRect={handleAddRect}
        onAddCircle={handleAddCircle}
        onAddText={handleAddText}
        onAddLine={handleAddLine}
        onAddImage={handleAddImage}
        onUndo={editorState.undo}
        onRedo={editorState.redo}
        onSave={() => {
          editorState.save();
          toast.success('Gallery saved!');
        }}
        onTogglePreview={() => setIsPreviewMode(!isPreviewMode)}
        onToggleGrid={editorState.toggleGrid}
        onToggleSnap={editorState.toggleSnap}
        onGroup={handleGroup}
        onUngroup={handleUngroup}
        onToggleSelectMode={() => setIsSelectMode(!isSelectMode)}
        onDeselectAll={editorState.clearSelection}
        canGroup={canGroup}
        canUngroup={canUngroup}
        canUndo={editorState.canUndo}
        canRedo={editorState.canRedo}
        isSaving={editorState.isSaving}
        isPreviewMode={isPreviewMode}
        isSelectMode={isSelectMode}
        gridEnabled={editorState.gridEnabled}
        snapEnabled={editorState.snapEnabled}
        hasSelection={editorState.selectedIds.length > 0}
        lastSaved={editorState.lastSaved}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar - Toggle Panels */}
        {!isPreviewMode && (
          <div className="bg-base-200 border-r border-base-300 p-2 flex flex-col gap-2 shrink-0">
            <button
              onClick={() => {
                console.log('[GalleryEditor] Toggling layers:', !showLayers);
                setShowLayers(!showLayers);
              }}
              className={`btn btn-sm ${showLayers ? 'btn-primary' : 'btn-ghost'}`}
              title="Layers"
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                console.log('[GalleryEditor] Toggling properties:', !showProperties);
                setShowProperties(!showProperties);
              }}
              className={`btn btn-sm ${showProperties ? 'btn-primary' : 'btn-ghost'}`}
              title="Properties"
            >
              <Palette className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowTemplates(true)}
              className="btn btn-sm btn-ghost"
              title="Templates"
            >
              <Layout className="w-4 h-4" />
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
            isSelectMode={isSelectMode}
          />

          {/* Zoom indicator */}
          <div className="absolute bottom-4 right-4 bg-base-200 px-3 py-1 rounded-lg shadow text-sm">
            {Math.round(editorState.zoom * 100)}%
          </div>

          {/* Preview mode badge */}
          {isPreviewMode && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-accent text-accent-content px-4 py-2 rounded-lg shadow-lg font-semibold">
              Preview Mode
            </div>
          )}
        </div>

        {/* Right Sidebar - Combined Panels */}
        {!isPreviewMode && (showLayers || showProperties) && (
          <div className="shrink-0 border-l border-1 border-base-300 w-80 flex flex-col overflow-hidden">
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

      {/* Unsaved changes indicator */}
      {editorState.hasUnsavedChanges && !isPreviewMode && (
        <div className="absolute top-20 right-4 bg-warning text-warning-content px-3 py-1 rounded text-xs">
          Unsaved changes
        </div>
      )}

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
    </div>
  );
}
