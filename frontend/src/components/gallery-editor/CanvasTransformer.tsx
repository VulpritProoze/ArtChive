import { useEffect, useRef } from 'react';
import { Transformer } from 'react-konva';
import type { CanvasObject } from '@types';

interface CanvasTransformerProps {
  selectedIds: string[];
  objects: CanvasObject[];
  onUpdate: (id: string, updates: Partial<CanvasObject>) => void;
  onTransformStart?: () => void;
  onTransformEnd?: () => void;
}

export function CanvasTransformer({ selectedIds, objects, onUpdate, onTransformStart, onTransformEnd }: CanvasTransformerProps) {
  const transformerRef = useRef<any>(null);

  useEffect(() => {
    if (!transformerRef.current) return;

    const transformer = transformerRef.current;
    const stage = transformer.getStage();

    if (!stage) return;

    const selectedNodes = selectedIds
      .map((id) => stage.findOne(`#${id}`))
      .filter(Boolean);

    transformer.nodes(selectedNodes);

    // Check if any selected object is a group
    const hasGroupSelected = selectedIds.some(id => {
      const obj = objects.find(o => o.id === id);
      return obj?.type === 'group';
    });

    // Disable resizing for groups (but allow rotation)
    if (hasGroupSelected) {
      transformer.enabledAnchors(['middle-left', 'middle-right', 'top-center', 'bottom-center']);
      transformer.resizeEnabled(false);
    } else {
      transformer.enabledAnchors(['top-left', 'top-center', 'top-right', 'middle-right', 'middle-left', 'bottom-left', 'bottom-center', 'bottom-right']);
      transformer.resizeEnabled(true);
    }

    transformer.getLayer()?.batchDraw();
  }, [selectedIds, objects]);

  const handleTransform = () => {
    console.log('[CanvasTransformer] Transform started');
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

      // Get the current object from the objects array to get the base width/height
      const currentObject = objects.find(obj => obj.id === id);

      const updates: any = {
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
      };

      // For shapes with width/height, apply the scale to the base dimensions
      if (node.width && currentObject && 'width' in currentObject && currentObject.width !== undefined) {
        updates.width = Math.max(5, currentObject.width * scaleX);
        updates.scaleX = 1;
      } else {
        updates.scaleX = scaleX;
      }

      if (node.height && currentObject && 'height' in currentObject && currentObject.height !== undefined) {
        updates.height = Math.max(5, currentObject.height * scaleY);
        updates.scaleY = 1;
      } else {
        updates.scaleY = scaleY;
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
        // Limit minimum size
        if (newBox.width < 5 || newBox.height < 5) {
          return oldBox;
        }
        return newBox;
      }}
    />
  );
}
