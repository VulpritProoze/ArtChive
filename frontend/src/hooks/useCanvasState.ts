import { useState, useCallback, useEffect, useRef } from 'react';
import type { CanvasObject, EditorState, Command } from '@/types/canvas';
import { useUndoRedo } from './useUndoRedo';
import { galleryService } from '@services/gallery.service';

interface UseCanvasStateProps {
  galleryId?: string;
  initialState?: Partial<EditorState>;
  autoSaveInterval?: number;
}

interface UseCanvasStateReturn extends EditorState {
  addObject: (obj: CanvasObject) => void;
  updateObject: (id: string, updates: Partial<CanvasObject>) => void;
  deleteObject: (id: string) => void;
  selectObjects: (ids: string[]) => void;
  clearSelection: () => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  groupObjects: (ids: string[]) => void;
  ungroupObject: (groupId: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  save: () => Promise<void>;
  initializeState: (canvasData: { objects: CanvasObject[]; width?: number; height?: number; background?: string }) => void;
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
}

export function useCanvasState({
  galleryId,
  initialState,
  autoSaveInterval = 60000, // 60 seconds
}: UseCanvasStateProps): UseCanvasStateReturn {
  const [state, setState] = useState<EditorState>({
    objects: [],
    width: 1920,
    height: 1080,
    selectedIds: [],
    clipboard: [],
    zoom: 1,
    panX: 0,
    panY: 0,
    gridEnabled: true,
    snapEnabled: true,
    ...initialState,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const undoRedo = useUndoRedo();

  // Mark as having unsaved changes whenever state changes
  useEffect(() => {
    if (lastSaved !== null) {
      console.log('[useCanvasState] Objects changed, marking as unsaved. Object count:', state.objects.length);
      setHasUnsavedChanges(true);
    }
  }, [state.objects, lastSaved]);

  // Auto-save functionality
  const save = useCallback(async () => {
    console.log('[useCanvasState] Save called. galleryId:', galleryId);

    if (!galleryId) {
      console.warn('[useCanvasState] No galleryId provided, skipping save');
      return;
    }

    const canvasData = {
      objects: state.objects,
      background: state.background,
      width: state.width,
      height: state.height,
    };

    console.log('[useCanvasState] Saving canvas data:', {
      objectCount: canvasData.objects.length,
      width: canvasData.width,
      height: canvasData.height,
      background: canvasData.background,
    });

    setIsSaving(true);
    try {
      const result = await galleryService.saveGallery(galleryId, canvasData);
      console.log('[useCanvasState] Save successful:', result);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('[useCanvasState] Failed to save gallery:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [galleryId, state]);

  // Auto-save timer
  useEffect(() => {
    console.log('[useCanvasState] Auto-save timer effect triggered:', {
      galleryId,
      hasUnsavedChanges,
      autoSaveInterval,
    });

    if (!galleryId) {
      console.log('[useCanvasState] No galleryId, auto-save timer not started');
      return;
    }

    if (!hasUnsavedChanges) {
      console.log('[useCanvasState] No unsaved changes, auto-save timer not started');
      return;
    }

    console.log(`[useCanvasState] Starting auto-save timer (${autoSaveInterval}ms)`);
    autoSaveTimerRef.current = setTimeout(() => {
      console.log('[useCanvasState] Auto-save timer fired, calling save()');
      save();
    }, autoSaveInterval);

    return () => {
      if (autoSaveTimerRef.current) {
        console.log('[useCanvasState] Clearing auto-save timer');
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [galleryId, hasUnsavedChanges, autoSaveInterval, save]);

  const addObject = useCallback(
    (obj: CanvasObject) => {
      const command: Command = {
        execute: () => {
          setState((prev) => ({
            ...prev,
            objects: [...prev.objects, obj],
          }));
        },
        undo: () => {
          setState((prev) => ({
            ...prev,
            objects: prev.objects.filter((o) => o.id !== obj.id),
          }));
        },
        description: `Add ${obj.type}`,
      };
      undoRedo.execute(command);
    },
    [undoRedo]
  );

  const updateObject = useCallback(
    (id: string, updates: Partial<CanvasObject>) => {
      const oldObject = state.objects.find((o) => o.id === id);
      if (!oldObject) return;

      const command: Command = {
        execute: () => {
          setState((prev) => ({
            ...prev,
            objects: prev.objects.map((o) =>
              o.id === id ? ({ ...o, ...updates } as CanvasObject) : o
            ),
          }));
        },
        undo: () => {
          setState((prev) => ({
            ...prev,
            objects: prev.objects.map((o) => (o.id === id ? oldObject : o)),
          }));
        },
        description: `Update ${oldObject.type}`,
      };
      undoRedo.execute(command);
    },
    [state.objects, undoRedo]
  );

  const deleteObject = useCallback(
    (id: string) => {
      const objectToDelete = state.objects.find((o) => o.id === id);
      if (!objectToDelete) return;

      const command: Command = {
        execute: () => {
          setState((prev) => ({
            ...prev,
            objects: prev.objects.filter((o) => o.id !== id),
            selectedIds: prev.selectedIds.filter((sid) => sid !== id),
          }));
        },
        undo: () => {
          setState((prev) => ({
            ...prev,
            objects: [...prev.objects, objectToDelete],
          }));
        },
        description: `Delete ${objectToDelete.type}`,
      };
      undoRedo.execute(command);
    },
    [state.objects, undoRedo]
  );

  const selectObjects = useCallback((ids: string[]) => {
    setState((prev) => ({ ...prev, selectedIds: ids }));
  }, []);

  const clearSelection = useCallback(() => {
    setState((prev) => ({ ...prev, selectedIds: [] }));
  }, []);

  const setZoom = useCallback((zoom: number) => {
    const clampedZoom = Math.max(0.2, Math.min(3, zoom));
    setState((prev) => ({ ...prev, zoom: clampedZoom }));
  }, []);

  const setPan = useCallback((x: number, y: number) => {
    setState((prev) => ({ ...prev, panX: x, panY: y }));
  }, []);

  const toggleGrid = useCallback(() => {
    setState((prev) => ({ ...prev, gridEnabled: !prev.gridEnabled }));
  }, []);

  const toggleSnap = useCallback(() => {
    setState((prev) => ({ ...prev, snapEnabled: !prev.snapEnabled }));
  }, []);

  const groupObjects = useCallback(
    (ids: string[]) => {
      if (ids.length < 2) {
        console.warn('[useCanvasState] Need at least 2 objects to group');
        return;
      }

      const objectsToGroup = state.objects.filter((o) => ids.includes(o.id));
      if (objectsToGroup.length < 2) return;

      // Calculate bounding box for the group
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      objectsToGroup.forEach((obj) => {
        const objMinX = obj.x;
        const objMinY = obj.y;
        let objMaxX = obj.x;
        let objMaxY = obj.y;

        if ('width' in obj && obj.width !== undefined) {
          objMaxX = obj.x + obj.width * (obj.scaleX || 1);
        }
        if ('height' in obj && obj.height !== undefined) {
          objMaxY = obj.y + obj.height * (obj.scaleY || 1);
        }
        if ('radius' in obj && obj.radius !== undefined) {
          const radiusX = obj.radius * (obj.scaleX || 1);
          const radiusY = obj.radius * (obj.scaleY || 1);
          objMaxX = obj.x + radiusX;
          objMaxY = obj.y + radiusY;
        }

        minX = Math.min(minX, objMinX);
        minY = Math.min(minY, objMinY);
        maxX = Math.max(maxX, objMaxX);
        maxY = Math.max(maxY, objMaxY);
      });

      const groupWidth = maxX - minX;
      const groupHeight = maxY - minY;

      // Create children with relative positions
      const children = objectsToGroup.map((obj) => ({
        ...obj,
        x: obj.x - minX,
        y: obj.y - minY,
      }));

      const groupId = Math.random().toString(36).substring(2, 15);
      const newGroup: CanvasObject = {
        id: groupId,
        type: 'group',
        x: minX,
        y: minY,
        width: groupWidth,
        height: groupHeight,
        children,
        draggable: true,
      };

      const command: Command = {
        execute: () => {
          setState((prev) => ({
            ...prev,
            objects: [
              ...prev.objects.filter((o) => !ids.includes(o.id)),
              newGroup,
            ],
            selectedIds: [groupId],
          }));
        },
        undo: () => {
          setState((prev) => ({
            ...prev,
            objects: [
              ...prev.objects.filter((o) => o.id !== groupId),
              ...objectsToGroup,
            ],
            selectedIds: ids,
          }));
        },
        description: 'Group objects',
      };
      undoRedo.execute(command);
    },
    [state.objects, undoRedo]
  );

  const ungroupObject = useCallback(
    (groupId: string) => {
      const group = state.objects.find((o) => o.id === groupId);
      if (!group || group.type !== 'group') {
        console.warn('[useCanvasState] Object is not a group');
        return;
      }

      // Convert children back to absolute positions
      const ungroupedObjects = group.children.map((child) => ({
        ...child,
        x: child.x + group.x,
        y: child.y + group.y,
      }));

      const childIds = ungroupedObjects.map((o) => o.id);

      const command: Command = {
        execute: () => {
          setState((prev) => ({
            ...prev,
            objects: [
              ...prev.objects.filter((o) => o.id !== groupId),
              ...ungroupedObjects,
            ],
            selectedIds: childIds,
          }));
        },
        undo: () => {
          setState((prev) => ({
            ...prev,
            objects: [
              ...prev.objects.filter((o) => !childIds.includes(o.id)),
              group,
            ],
            selectedIds: [groupId],
          }));
        },
        description: 'Ungroup objects',
      };
      undoRedo.execute(command);
    },
    [state.objects, undoRedo]
  );

  const initializeState = useCallback((canvasData: { objects: CanvasObject[]; width?: number; height?: number; background?: string }) => {
    console.log('[useCanvasState] initializeState called with:', {
      objectCount: canvasData.objects.length,
      width: canvasData.width,
      height: canvasData.height,
      background: canvasData.background,
    });

    setState((prev) => ({
      ...prev,
      objects: canvasData.objects,
      width: canvasData.width ?? prev.width,
      height: canvasData.height ?? prev.height,
      background: canvasData.background,
    }));

    console.log('[useCanvasState] State initialized with canvas data');
    setLastSaved(new Date());
    setHasUnsavedChanges(false);
  }, []);

  return {
    ...state,
    addObject,
    updateObject,
    deleteObject,
    selectObjects,
    clearSelection,
    setZoom,
    setPan,
    toggleGrid,
    toggleSnap,
    groupObjects,
    ungroupObject,
    undo: undoRedo.undo,
    redo: undoRedo.redo,
    canUndo: undoRedo.canUndo,
    canRedo: undoRedo.canRedo,
    save,
    initializeState,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
  };
}
