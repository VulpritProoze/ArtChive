import React, { useEffect, useRef } from 'react';
import { Transformer as KonvaTransformer } from 'react-konva';
import Konva from 'konva'

interface TransformerProps {
  selectedId: string | null;
  shapeRef: React.RefObject<Konva.Rect | Konva.Circle | null>;
}

const Transformer: React.FC<TransformerProps> = ({ selectedId, shapeRef }) => {
  const transformerRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (selectedId && transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, shapeRef]);

  const isCircle = shapeRef.current instanceof Konva.Circle;
  const enabledAnchors = isCircle
    ? ['top-left', 'top-right', 'bottom-right', 'bottom-left']
    : [
        'top-left',
        'top-center',
        'top-right',
        'right-center',
        'bottom-right',
        'bottom-center',
        'bottom-left',
        'left-center',
      ];

  return (
    <KonvaTransformer
      ref={transformerRef}
      borderStroke="blue"
      borderStrokeWidth={2}
      anchorStroke="blue"
      anchorFill="white"
      anchorSize={8}
      rotateEnabled={true}
      enabledAnchors={enabledAnchors}
    />
  );
};

export default Transformer;