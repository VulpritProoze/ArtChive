import { useEffect, useRef } from 'react';
import { Transformer } from 'react-konva';
import type { CanvasObject } from '@types';

interface CanvasTransformerProps {
  selectedIds: string[];
  objects: CanvasObject[];
  onUpdate: (id: string, updates: Partial<CanvasObject>) => void;
}

export function CanvasTransformer({ selectedIds, objects, onUpdate }: CanvasTransformerProps) {
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
    transformer.getLayer()?.batchDraw();
  }, [selectedIds]);

  const handleTransformEnd = (e: any) => {
    const node = e.target;
    const id = node.id();

    if (!id) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale and adjust width/height instead
    node.scaleX(1);
    node.scaleY(1);

    onUpdate(id, {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      scaleX,
      scaleY,
      // Update width/height if applicable
      ...(node.width && { width: Math.max(5, node.width() * scaleX) }),
      ...(node.height && { height: Math.max(5, node.height() * scaleY) }),
    });
  };

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <Transformer
      ref={transformerRef}
      onTransformEnd={handleTransformEnd}
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
