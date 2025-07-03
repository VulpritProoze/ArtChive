import React, { useRef } from 'react';
import { Layer, Line } from 'react-konva';
import RectShape from './shapes/rect-shape';
import CircleShape from './shapes/circle-shape';
import Transformer from './shapes/transformer';
import  Konva from 'konva'
import type { Layer as LayerType, Shape } from '../types';

interface CanvasLayerProps {
  layers: LayerType[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  gridSize: number;
  stageHeight: number;
  stageWidth: number;
  stageRef: React.RefObject<Konva.Stage | null>;
}

const CanvasLayer: React.FC<CanvasLayerProps> = ({
  layers,
  selectedId,
  setSelectedId,
  updateShape,
  gridSize,
  stageHeight,
  stageWidth,
  stageRef,
}) => {
  const shapeRefs = useRef<Map<string, Konva.Rect | Konva.Circle>>(new Map());

  const gridLines = [];
  for (let i = 0; i <= stageWidth / gridSize; i++) {
    gridLines.push(
      <Line
        key={`v${i}`}
        points={[i * gridSize, 0, i * gridSize, stageHeight]}
        stroke="#e0e0e0"
        strokeWidth={1}
      />
    );
  }
  for (let i = 0; i <= stageHeight / gridSize; i++) {
    gridLines.push(
      <Line
        key={`h${i}`}
        points={[0, i * gridSize, stageWidth, i * gridSize]}
        stroke="#e0e0e0"
        strokeWidth={1}
      />
    );
  }

  return (
    <>
      <Layer>{gridLines}</Layer>
      {layers
        .filter((layer) => layer.shape) // Render only layers with shapes
        .map((layer) => (
          <Layer key={layer.id}>
            {layer.shape.type === 'rect' ? (
              <RectShape
                key={layer.shape.id}
                shape={layer.shape}
                isSelected={layer.shape.id === selectedId}
                onSelect={() => setSelectedId(layer.shape.id)}
                onChange={(updates) => updateShape(layer.shape.id, updates)}
                stageWidth={stageWidth}
                stageHeight={stageHeight}
                stageRef={stageRef}
                shapeRef={(node) => {
                  if (node) {
                    shapeRefs.current.set(layer.shape.id, node);
                  } else {
                    shapeRefs.current.delete(layer.shape.id);
                  }
                }}
              />
            ) : (
              <CircleShape
                key={layer.shape.id}
                shape={layer.shape}
                isSelected={layer.shape.id === selectedId}
                onSelect={() => setSelectedId(layer.shape.id)}
                onChange={(updates) => updateShape(layer.shape.id, updates)}
                stageWidth={stageWidth}
                stageHeight={stageHeight}
                stageRef={stageRef}
                shapeRef={(node) => {
                  if (node) {
                    shapeRefs.current.set(layer.shape.id, node);
                  } else {
                    shapeRefs.current.delete(layer.shape.id);
                  }
                }}
              />
            )}
            {selectedId && layer.shape.id === selectedId && (
              <Transformer
                selectedId={selectedId}
                shapeRef={{
                  current: shapeRefs.current.get(selectedId) || null,
                }}
              />
            )}
          </Layer>
        ))}
    </>
  );
};

export default CanvasLayer;