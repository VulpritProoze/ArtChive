import { useEffect, useRef } from 'react';
import { Transformer } from 'react-konva';
import type { CanvasObject } from '@types';

interface CanvasTransformerProps {
  selectedIds: string[];
  objects: CanvasObject[];
  onUpdate: (id: string, updates: Partial<CanvasObject>) => void;
  onTransformStart?: () => void;
  onTransformEnd?: () => void;
  onRotate?: (angle: number, x: number, y: number, isSnapped: boolean) => void;
}

export function CanvasTransformer({ selectedIds, objects, onUpdate, onTransformStart, onTransformEnd, onRotate }: CanvasTransformerProps) {
  const transformerRef = useRef<any>(null);

  // Helper function to find an object by ID, including children in groups
  const findObjectById = (id: string, objectsList: CanvasObject[]): CanvasObject | null => {
    for (const obj of objectsList) {
      if (obj.id === id) {
        return obj;
      }
      if (obj.type === 'group' && 'children' in obj && obj.children) {
        const found = findObjectById(id, obj.children);
        if (found) return found;
      }
    }
    return null;
  };

  useEffect(() => {
    if (!transformerRef.current) return;

    const transformer = transformerRef.current;
    const stage = transformer.getStage();

    if (!stage) return;

    const selectedNodes = selectedIds
      .map((id) => stage.findOne(`#${id}`))
      .filter(Boolean);

    transformer.nodes(selectedNodes);

    // Check if any selected object is a group or line (including nested objects)
    const hasGroupSelected = selectedIds.some(id => {
      const obj = findObjectById(id, objects);
      return obj?.type === 'group';
    });

    const hasLineSelected = selectedIds.some(id => {
      const obj = findObjectById(id, objects);
      return obj?.type === 'line';
    });

    // Disable resizing for groups (but allow rotation)
    if (hasGroupSelected) {
      transformer.enabledAnchors(['middle-left', 'middle-right', 'top-center', 'bottom-center']);
      transformer.resizeEnabled(false);
    } else if (hasLineSelected) {
      // For lines, only allow horizontal resizing (left and right anchors only)
      transformer.enabledAnchors(['middle-left', 'middle-right']);
      transformer.resizeEnabled(true);
    } else {
      transformer.enabledAnchors(['top-left', 'top-center', 'top-right', 'middle-right', 'middle-left', 'bottom-left', 'bottom-center', 'bottom-right']);
      transformer.resizeEnabled(true);
    }

    transformer.getLayer()?.batchDraw();
  }, [selectedIds, objects]);

  const handleTransform = () => {
    console.log('[CanvasTransformer] Transform started');
    // During transform, ensure lines maintain scaleY = 1 and report rotation
    if (transformerRef.current) {
      const transformer = transformerRef.current;
      const nodes = transformer.nodes();
      nodes.forEach((node: any) => {
        const id = node.id();
        if (id) {
          const obj = findObjectById(id, objects);
          if (obj?.type === 'line') {
            // Force scaleY to 1 during transform to prevent vertical resizing
            node.scaleY(1);
          }

          // Report rotation if callback exists
          if (onRotate) {
            const rotation = node.rotation();
            const rotationSnap = 45;
            const snappedRotation = Math.round(rotation / rotationSnap) * rotationSnap;
            const isSnapped = Math.abs(rotation - snappedRotation) < 5;

            onRotate(rotation, node.x(), node.y(), isSnapped);
          }
        }
      });
    }
    // Notify that transformation is in progress
    if (onTransformStart) {
      onTransformStart();
    }
  };

  const handleTransformEndInternal = () => {
    console.log('[CanvasTransformer] Transform ended');
    const transformer = transformerRef.current;
    if (!transformer) {
      console.log('[CanvasTransformer] No transformer ref');
      return;
    }

    // Get all nodes attached to the transformer
    const nodes = transformer.nodes();
    console.log('[CanvasTransformer] Nodes attached to transformer:', nodes.length);

    // Update each transformed node
    nodes.forEach((node: any) => {
      const id = node.id();
      console.log('[CanvasTransformer] Processing node:', {
        id,
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
        scaleX: node.scaleX(),
        scaleY: node.scaleY(),
        width: node.width?.(),
        height: node.height?.(),
      });

      if (!id) return;

      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      // Get the current object (including nested children in groups)
      const currentObject = findObjectById(id, objects);

      // Snap rotation to 45-degree increments
      let rotation = node.rotation();
      const rotationSnap = 45;
      const snappedRotation = Math.round(rotation / rotationSnap) * rotationSnap;

      // Only snap if close to a 45-degree mark (within 5 degrees)
      if (Math.abs(rotation - snappedRotation) < 5) {
        rotation = snappedRotation;
        node.rotation(rotation); // Update node rotation for visual feedback
      }

      const updates: any = {
        x: node.x(),
        y: node.y(),
        rotation: rotation,
      };

      // For lines, only allow width resizing (horizontal scaling)
      if (currentObject && currentObject.type === 'line') {
        // For lines, we modify the points array to change width
        // Only apply horizontal scaling, ignore vertical scaling
        if (scaleX !== 1 && currentObject.type === 'line' && 'points' in currentObject) {
          const points = [...(currentObject as any).points];
          // Scale only X coordinates (even indices)
          for (let i = 0; i < points.length; i += 2) {
            points[i] = points[i] * scaleX;
          }
          updates.points = points;
        }
        // Always reset scaleY to 1 for lines (prevent vertical resizing)
        updates.scaleX = 1;
        updates.scaleY = 1;
        // Also ensure node scaleY is reset immediately
        node.scaleY(1);
      }
      // For shapes with width/height, apply the scale to the base dimensions
      else if (node.width && currentObject && 'width' in currentObject && currentObject.width !== undefined) {
        updates.width = Math.max(5, currentObject.width * scaleX);
        updates.scaleX = 1;
      } else {
        updates.scaleX = scaleX;
      }

      if (currentObject && currentObject.type !== 'line') {
        if (node.height && currentObject && 'height' in currentObject && currentObject.height !== undefined) {
          updates.height = Math.max(5, currentObject.height * scaleY);
          updates.scaleY = 1;
        } else {
          updates.scaleY = scaleY;
        }
      }

      // For circles, preserve scaleX and scaleY to allow elliptical shapes
      if (currentObject && 'radius' in currentObject && currentObject.radius !== undefined) {
        // Keep the scale values instead of resetting them
        // This allows circles to become ellipses (oblongs)
        updates.scaleX = scaleX;
        updates.scaleY = scaleY;
      }

      console.log('[CanvasTransformer] Calling onUpdate with:', { id, updates });
      onUpdate(id, updates);

      // Reset node scale after update (but not for circles which use scale)
      if (currentObject && currentObject.type !== 'circle') {
        node.scaleX(1);
        node.scaleY(1);
      }
    });

    // Notify that transformation is complete
    if (onTransformEnd) {
      onTransformEnd();
    }
  };

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <Transformer
      ref={transformerRef}
      onTransform={handleTransform}
      onTransformEnd={handleTransformEndInternal}
      boundBoxFunc={(oldBox, newBox) => {
        // Check if any selected object is a line (including nested in groups)
        const hasLineSelected = selectedIds.some(id => {
          const obj = findObjectById(id, objects);
          return obj?.type === 'line';
        });

        // For lines, prevent height changes
        if (hasLineSelected) {
          return {
            ...newBox,
            height: oldBox.height, // Keep original height
          };
        }

        // Limit minimum size
        if (newBox.width < 5 || newBox.height < 5) {
          return oldBox;
        }
        return newBox;
      }}
    />
  );
}
