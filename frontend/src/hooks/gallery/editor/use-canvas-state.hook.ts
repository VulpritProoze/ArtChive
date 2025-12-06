import { useState, useCallback, useEffect, useRef } from 'react';
import type { CanvasObject, EditorState, Command, ImageObject } from '@types';
import { useUndoRedo } from './use-undo-redo.hook';
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
  copyObjects: () => void;
  pasteObjects: () => void;
  pasteObjectsAtPosition: (afterObjectId: string | null) => void;
  attachImageToFrame: (imageId: string, frameId: string) => void;
  detachImageFromFrame: (frameId: string) => void;
  reorderObject: (id: string, direction: 'up' | 'down') => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  save: () => Promise<void>;
  initializeState: (canvasData: { objects: CanvasObject[]; width?: number; height?: number; background?: string }) => void;
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  findObject: (id: string) => CanvasObject | null;
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
      setHasUnsavedChanges(true);
    }
  }, [state.objects]);

  // Auto-save functionality
  const save = useCallback(async () => {
    if (!galleryId) {
      return;
    }

    const canvasData = {
      objects: state.objects,
      background: state.background,
      width: state.width,
      height: state.height,
    };

    setIsSaving(true);
    try {
      await galleryService.saveGallery(galleryId, canvasData);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [galleryId, state]);

  // Auto-save timer
  useEffect(() => {
    if (!galleryId) {
      return;
    }

    if (!hasUnsavedChanges) {
      return;
    }

    autoSaveTimerRef.current = setTimeout(() => {
      save();
    }, autoSaveInterval);

    return () => {
      if (autoSaveTimerRef.current) {
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

  // Helper function to find an object by ID (including within groups)
  const findObject = useCallback((objects: CanvasObject[], id: string): CanvasObject | null => {
    for (const obj of objects) {
      if (obj.id === id) return obj;
      if ((obj.type === 'group' || obj.type === 'frame') && 'children' in obj && obj.children) {
        const found = findObject(obj.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Helper function to recalculate group bounds based on children
  const recalculateGroupBounds = useCallback((group: CanvasObject): CanvasObject => {
    if (group.type !== 'group' || !('children' in group) || !group.children || group.children.length === 0) {
      return group;
    }

    const visibleChildren = group.children.filter(child => child.visible !== false);
    if (visibleChildren.length === 0) {
      return group;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    visibleChildren.forEach((child) => {
      const childMinX = child.x;
      const childMinY = child.y;
      let childMaxX = child.x;
      let childMaxY = child.y;

      if ('width' in child && child.width !== undefined) {
        childMaxX = child.x + child.width * (child.scaleX || 1);
      }
      if ('height' in child && child.height !== undefined) {
        childMaxY = child.y + child.height * (child.scaleY || 1);
      }
      if ('radius' in child && child.radius !== undefined) {
        const radiusX = child.radius * (child.scaleX || 1);
        const radiusY = child.radius * (child.scaleY || 1);
        childMaxX = child.x + radiusX;
        childMaxY = child.y + radiusY;
      }

      minX = Math.min(minX, childMinX);
      minY = Math.min(minY, childMinY);
      maxX = Math.max(maxX, childMaxX);
      maxY = Math.max(maxY, childMaxY);
    });

    const newWidth = maxX - minX;
    const newHeight = maxY - minY;

    return {
      ...group,
      width: newWidth,
      height: newHeight,
    };
  }, []);

  // Helper function to update an object (including within groups and frames)
  const updateObjectInTree = useCallback((objects: CanvasObject[], id: string, updates: Partial<CanvasObject>): CanvasObject[] => {
    return objects.map((o) => {
      if (o.id === id) {
        return { ...o, ...updates } as CanvasObject;
      }
      if ((o.type === 'group' || o.type === 'frame') && 'children' in o && o.children) {
        const updatedContainer = {
          ...o,
          children: updateObjectInTree(o.children, id, updates),
        } as CanvasObject;
        // Recalculate group bounds after updating a child (frames have fixed dimensions, so skip)
        if (o.type === 'group') {
          return recalculateGroupBounds(updatedContainer);
        }
        return updatedContainer;
      }
      return o;
    });
  }, [recalculateGroupBounds]);

  const updateObject = useCallback(
    (id: string, updates: Partial<CanvasObject>) => {
      const oldObject = findObject(state.objects, id);
      if (!oldObject) return;

      const command: Command = {
        execute: () => {
          setState((prev) => {
            let newObjects = updateObjectInTree(prev.objects, id, updates);
            // Also recalculate bounds for the updated object if it's a group
            newObjects = newObjects.map(obj => {
              if (obj.id === id && obj.type === 'group') {
                return recalculateGroupBounds(obj);
              }
              return obj;
            });
            return {
              ...prev,
              objects: newObjects,
            };
          });
        },
        undo: () => {
          setState((prev) => ({
            ...prev,
            objects: updateObjectInTree(prev.objects, id, { ...oldObject }),
          }));
        },
        description: `Update ${oldObject.type}`,
      };
      undoRedo.execute(command);
    },
    [state.objects, undoRedo, findObject, updateObjectInTree, recalculateGroupBounds]
  );

  // Helper function to delete an object (including within groups and frames)
  const deleteObjectFromTree = useCallback((objects: CanvasObject[], id: string): CanvasObject[] => {
    return objects
      .filter((o) => o.id !== id)
      .map((o) => {
        if ((o.type === 'group' || o.type === 'frame') && 'children' in o && o.children) {
          const updatedContainer = {
            ...o,
            children: deleteObjectFromTree(o.children, id),
          } as CanvasObject;
          // Recalculate group bounds after deleting a child (frames have fixed dimensions, so skip)
          if (o.type === 'group') {
            return recalculateGroupBounds(updatedContainer);
          }
          return updatedContainer;
        }
        return o;
      });
  }, [recalculateGroupBounds]);

  const deleteObject = useCallback(
    (id: string) => {
      const objectToDelete = findObject(state.objects, id);
      if (!objectToDelete) return;

      const command: Command = {
        execute: () => {
          setState((prev) => ({
            ...prev,
            objects: deleteObjectFromTree(prev.objects, id),
            selectedIds: prev.selectedIds.filter((sid) => sid !== id),
          }));
        },
        undo: () => {
          // For undo, we need to restore the object in the correct position
          // This is a simplified version - restoring to top level
          setState((prev) => ({
            ...prev,
            objects: [...prev.objects, objectToDelete],
          }));
        },
        description: `Delete ${objectToDelete.type}`,
      };
      undoRedo.execute(command);
    },
    [state.objects, undoRedo, findObject, deleteObjectFromTree]
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
        return;
      }

      // Convert children back to absolute positions
      // Reset draggable property for frames (so they can be moved after ungrouping)
      const ungroupedObjects = group.children.map((child) => {
        const ungrouped = {
          ...child,
          x: child.x + group.x,
          y: child.y + group.y,
        };
        // Reset draggable for frames if it was false (from templates)
        if (ungrouped.type === 'frame' && ungrouped.draggable === false) {
          ungrouped.draggable = true;
        }
        return ungrouped;
      });

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

  // Helper function to deep clone an object and generate new IDs
  const cloneObjectWithNewId = useCallback((obj: CanvasObject): CanvasObject => {
    const newId = Math.random().toString(36).substring(2, 15);
    const cloned = { ...obj, id: newId };

    // If it's a group, clone children with new IDs too
    if (cloned.type === 'group' && cloned.children) {
      cloned.children = cloned.children.map(child => cloneObjectWithNewId(child));
    }

    return cloned;
  }, []);

  const copyObjects = useCallback(() => {
    const selectedObjects = state.objects.filter((o) => state.selectedIds.includes(o.id));
    if (selectedObjects.length > 0) {
      setState((prev) => ({
        ...prev,
        clipboard: selectedObjects,
      }));
    }
  }, [state.objects, state.selectedIds]);

  const pasteObjects = useCallback(() => {
    if (state.clipboard.length === 0) {
      return;
    }

    const offset = 20; // Offset in pixels
    const pastedObjects = state.clipboard.map(obj => {
      const cloned = cloneObjectWithNewId(obj);
      return {
        ...cloned,
        x: cloned.x + offset,
        y: cloned.y + offset,
      };
    });

    const pastedIds = pastedObjects.map(o => o.id);

    const command: Command = {
      execute: () => {
        setState((prev) => ({
          ...prev,
          objects: [...prev.objects, ...pastedObjects],
          selectedIds: pastedIds,
        }));
      },
      undo: () => {
        setState((prev) => ({
          ...prev,
          objects: prev.objects.filter((o) => !pastedIds.includes(o.id)),
          selectedIds: state.selectedIds,
        }));
      },
      description: `Paste ${pastedObjects.length} object(s)`,
    };
    undoRedo.execute(command);
  }, [state.clipboard, state.selectedIds, undoRedo, cloneObjectWithNewId]);

  const pasteObjectsAtPosition = useCallback((afterObjectId: string | null) => {
    if (state.clipboard.length === 0) {
      return;
    }

    const offset = 20; // Offset in pixels
    const pastedObjects = state.clipboard.map(obj => {
      const cloned = cloneObjectWithNewId(obj);
      return {
        ...cloned,
        x: cloned.x + offset,
        y: cloned.y + offset,
      };
    });

    const pastedIds = pastedObjects.map(o => o.id);

    const command: Command = {
      execute: () => {
        setState((prev) => {
          if (afterObjectId === null) {
            // Paste at the beginning
            return {
              ...prev,
              objects: [...pastedObjects, ...prev.objects],
              selectedIds: pastedIds,
            };
          }

          // Find the index of the object to paste after
          const afterIndex = prev.objects.findIndex(o => o.id === afterObjectId);
          
          if (afterIndex === -1) {
            // Object not found, paste at end
            return {
              ...prev,
              objects: [...prev.objects, ...pastedObjects],
              selectedIds: pastedIds,
            };
          }

          // Insert pasted objects right after the target object
          const newObjects = [
            ...prev.objects.slice(0, afterIndex + 1),
            ...pastedObjects,
            ...prev.objects.slice(afterIndex + 1),
          ];

          return {
            ...prev,
            objects: newObjects,
            selectedIds: pastedIds,
          };
        });
      },
      undo: () => {
        setState((prev) => ({
          ...prev,
          objects: prev.objects.filter((o) => !pastedIds.includes(o.id)),
          selectedIds: state.selectedIds,
        }));
      },
      description: `Paste ${pastedObjects.length} object(s)`,
    };
    undoRedo.execute(command);
  }, [state.clipboard, state.selectedIds, undoRedo, cloneObjectWithNewId]);

  // Helper to recursively remove image from tree
  const removeImageFromTree = useCallback((objects: CanvasObject[], imageId: string): CanvasObject[] => {
    return objects
      .filter((o) => o.id !== imageId) // Remove image from current level
      .map((o) => {
        if ((o.type === 'group' || o.type === 'frame') && 'children' in o && o.children) {
          return {
            ...o,
            children: removeImageFromTree(o.children, imageId),
          } as CanvasObject;
        }
        return o;
      });
  }, []);

  // Helper to recursively update frame in tree to add image child
  const updateFrameWithImage = useCallback((objects: CanvasObject[], frameId: string, imageChild: ImageObject): CanvasObject[] => {
    return objects.map((o) => {
      if (o.id === frameId && o.type === 'frame') {
        // Found the frame - add image as child
        return {
          ...o,
          children: [imageChild],
        } as CanvasObject;
      }
      if ((o.type === 'group' || o.type === 'frame') && 'children' in o && o.children) {
        // Recursively update children
        return {
          ...o,
          children: updateFrameWithImage(o.children, frameId, imageChild),
        } as CanvasObject;
      }
      return o;
    });
  }, []);

  // Helper to recursively restore frame children (for undo)
  const restoreFrameChildren = useCallback((objects: CanvasObject[], frameId: string, oldChildren: CanvasObject[]): CanvasObject[] => {
    return objects.map((o) => {
      if (o.id === frameId && o.type === 'frame') {
        // Found the frame - restore old children
        return {
          ...o,
          children: oldChildren,
        } as CanvasObject;
      }
      if ((o.type === 'group' || o.type === 'frame') && 'children' in o && o.children) {
        // Recursively update children
        return {
          ...o,
          children: restoreFrameChildren(o.children, frameId, oldChildren),
        } as CanvasObject;
      }
      return o;
    });
  }, []);

  // Helper to recursively restore image to tree (for detach)
  const restoreImageToTree = useCallback((objects: CanvasObject[], image: ImageObject, originalX: number, originalY: number): CanvasObject[] => {
    // Add image back to top-level objects array
    // Convert relative position back to absolute position if needed
    return [...objects, {
      ...image,
      x: originalX,
      y: originalY,
    }];
  }, []);

  // Helper to recursively remove image child from frame
  const removeImageChildFromFrame = useCallback((objects: CanvasObject[], frameId: string): CanvasObject[] => {
    return objects.map((o) => {
      if (o.id === frameId && o.type === 'frame') {
        // Found the frame - remove children
        return {
          ...o,
          children: [],
        } as CanvasObject;
      }
      if ((o.type === 'group' || o.type === 'frame') && 'children' in o && o.children) {
        // Recursively update children
        return {
          ...o,
          children: removeImageChildFromFrame(o.children, frameId),
        } as CanvasObject;
      }
      return o;
    });
  }, []);

  // Helper to find frame and calculate absolute position (accounting for parent groups)
  const findFrameWithAbsolutePosition = useCallback((objects: CanvasObject[], frameId: string, parentX = 0, parentY = 0): { frame: FrameObject; absX: number; absY: number } | null => {
    for (const obj of objects) {
      if (obj.id === frameId && obj.type === 'frame') {
        return {
          frame: obj as FrameObject,
          absX: parentX + obj.x,
          absY: parentY + obj.y,
        };
      }
      if (obj.type === 'group' && obj.children) {
        const found = findFrameWithAbsolutePosition(obj.children, frameId, parentX + obj.x, parentY + obj.y);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const reorderObject = useCallback((id: string, direction: 'up' | 'down') => {
    const currentIndex = state.objects.findIndex(o => o.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= state.objects.length) return;

    const command: Command = {
      execute: () => {
        setState((prev) => {
          const newObjects = [...prev.objects];
          const [movedObject] = newObjects.splice(currentIndex, 1);
          newObjects.splice(newIndex, 0, movedObject);
          
          return {
            ...prev,
            objects: newObjects,
          };
        });
      },
      undo: () => {
        // Reverse the operation
        setState((prev) => {
          const newObjects = [...prev.objects];
          const [movedObject] = newObjects.splice(newIndex, 1);
          newObjects.splice(currentIndex, 0, movedObject);
          
          return {
            ...prev,
            objects: newObjects,
          };
        });
      },
      description: `Move object ${direction === 'up' ? 'forward' : 'backward'}`,
    };
    undoRedo.execute(command);
  }, [state.objects, undoRedo]);

  const bringToFront = useCallback((id: string) => {
    const currentIndex = state.objects.findIndex(o => o.id === id);
    if (currentIndex === -1 || currentIndex === state.objects.length - 1) return; // Already at front (last index)

    const command: Command = {
      execute: () => {
        setState((prev) => {
          const newObjects = [...prev.objects];
          const [movedObject] = newObjects.splice(currentIndex, 1);
          newObjects.push(movedObject); // Add to end (front - rendered last, appears on top)
          
          return {
            ...prev,
            objects: newObjects,
          };
        });
      },
      undo: () => {
        setState((prev) => {
          const newObjects = [...prev.objects];
          const [movedObject] = newObjects.splice(newObjects.length - 1, 1); // Remove from end
          newObjects.splice(currentIndex, 0, movedObject); // Insert back at original position
          
          return {
            ...prev,
            objects: newObjects,
          };
        });
      },
      description: 'Bring to front',
    };
    undoRedo.execute(command);
  }, [state.objects, undoRedo]);

  const sendToBack = useCallback((id: string) => {
    const currentIndex = state.objects.findIndex(o => o.id === id);
    if (currentIndex === -1 || currentIndex === 0) return; // Already at back (first index)

    const command: Command = {
      execute: () => {
        setState((prev) => {
          const newObjects = [...prev.objects];
          const [movedObject] = newObjects.splice(currentIndex, 1);
          newObjects.unshift(movedObject); // Add to beginning (back - rendered first, appears behind)
          
          return {
            ...prev,
            objects: newObjects,
          };
        });
      },
      undo: () => {
        setState((prev) => {
          const newObjects = [...prev.objects];
          const [movedObject] = newObjects.splice(0, 1); // Remove from beginning
          newObjects.splice(currentIndex, 0, movedObject); // Insert back at original position
          
          return {
            ...prev,
            objects: newObjects,
          };
        });
      },
      description: 'Send to back',
    };
    undoRedo.execute(command);
  }, [state.objects, undoRedo]);

  const bringForward = useCallback((id: string) => {
    // Bring forward = move toward front (higher index, end of array)
    reorderObject(id, 'down');
  }, [reorderObject]);

  const sendBackward = useCallback((id: string) => {
    // Send backward = move toward back (lower index, beginning of array)
    reorderObject(id, 'up');
  }, [reorderObject]);

  const detachImageFromFrame = useCallback((frameId: string) => {
    const frameData = findFrameWithAbsolutePosition(state.objects, frameId);
    
    if (!frameData) {
      return;
    }

    const { frame, absX: frameAbsX, absY: frameAbsY } = frameData;

    if (!frame.children || frame.children.length === 0) {
      return;
    }

    const attachedImage = frame.children[0];
    if (attachedImage.type !== 'image') {
      return;
    }

    // Store old state for undo
    const oldFrameChildren = frame.children;
    const imageObj = attachedImage as ImageObject;
    
    // Calculate absolute position: frame absolute position + image's relative position within frame
    const absoluteX = frameAbsX + imageObj.x;
    const absoluteY = frameAbsY + imageObj.y;

    // Store original image (with absolute position restored)
    const originalImage: ImageObject = {
      ...imageObj,
      x: absoluteX,
      y: absoluteY,
    };

    const command: Command = {
      execute: () => {
        setState((prev) => {
          // Remove image from frame children and add it back to main objects array
          let updatedObjects = removeImageChildFromFrame(prev.objects, frameId);
          updatedObjects = restoreImageToTree(updatedObjects, originalImage, absoluteX, absoluteY);

          return {
            ...prev,
            objects: updatedObjects,
          };
        });
      },
      undo: () => {
        setState((prev) => {
          // Re-attach image to frame
          // Remove image from main array
          let restoredObjects = prev.objects.filter(obj => obj.id !== originalImage.id);
          // Re-add image as child of frame
          restoredObjects = updateFrameWithImage(restoredObjects, frameId, imageObj);
          
          return {
            ...prev,
            objects: restoredObjects,
          };
        });
      },
      description: 'Detach image from frame',
    };
    undoRedo.execute(command);
  }, [state.objects, undoRedo, findFrameWithAbsolutePosition, removeImageChildFromFrame, restoreImageToTree, updateFrameWithImage]);

  const attachImageToFrame = useCallback((imageId: string, frameId: string) => {
    const image = findObject(state.objects, imageId);
    const frame = findObject(state.objects, frameId);

    if (!image || image.type !== 'image' || !frame || frame.type !== 'frame') {
      return;
    }

    // Store old frame state for undo
    const oldFrameChildren = frame.children || [];
    const oldImage = { ...image };

    const command: Command = {
      execute: () => {
        setState((prev) => {
          // Calculate image dimensions and position relative to frame
          // Always use fit mode: maintain aspect ratio, fit inside frame
          const imgAspect = image.width / image.height;
          const frameAspect = frame.width / frame.height;

          let newWidth = frame.width;
          let newHeight = frame.height;
          let relativeX = 0;
          let relativeY = 0;

          // Maintain aspect ratio, fit inside frame
          if (imgAspect > frameAspect) {
            // Image is wider
            newWidth = frame.width;
            newHeight = frame.width / imgAspect;
            relativeY = (frame.height - newHeight) / 2;
          } else {
            // Image is taller
            newHeight = frame.height;
            newWidth = frame.height * imgAspect;
            relativeX = (frame.width - newWidth) / 2;
          }

          // Create image child with relative position
          const imageChild: ImageObject = {
            ...image,
            x: relativeX,
            y: relativeY,
            width: newWidth,
            height: newHeight,
          };

          // Recursively remove image from tree and update frame
          let updatedObjects = removeImageFromTree(prev.objects, imageId);
          updatedObjects = updateFrameWithImage(updatedObjects, frameId, imageChild);

          return {
            ...prev,
            objects: updatedObjects,
          };
        });
      },
      undo: () => {
        setState((prev) => {
          // Restore frame children and add image back to tree
          let restoredObjects = restoreFrameChildren(prev.objects, frameId, oldFrameChildren);
          // Add image back (at top level - images attached to frames shouldn't be in groups anyway)
          restoredObjects = [...restoredObjects, oldImage];
          
          return {
            ...prev,
            objects: restoredObjects,
          };
        });
      },
      description: 'Attach image to frame',
    };
    undoRedo.execute(command);
  }, [state.objects, undoRedo, findObject, removeImageFromTree, updateFrameWithImage, restoreFrameChildren]);

  const initializeState = useCallback((canvasData: { objects: CanvasObject[]; width?: number; height?: number; background?: string }) => {
    setState((prev) => ({
      ...prev,
      objects: canvasData.objects,
      width: canvasData.width ?? prev.width,
      height: canvasData.height ?? prev.height,
      background: canvasData.background,
    }));

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
    copyObjects,
    pasteObjects,
    pasteObjectsAtPosition,
    attachImageToFrame,
    detachImageFromFrame,
    reorderObject,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    undo: undoRedo.undo,
    redo: undoRedo.redo,
    canUndo: undoRedo.canUndo,
    canRedo: undoRedo.canRedo,
    save,
    initializeState,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    findObject: (id: string) => findObject(state.objects, id),
  };
}

