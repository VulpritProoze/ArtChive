import React from 'react';
import { Rect } from 'react-konva';
import type { Shape } from '../../types';
import  Konva from 'konva'

interface RectShapeProps {
  shape: Shape;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<Shape>) => void;
  stageWidth: number;
  stageHeight: number;
  stageRef: React.RefObject<Konva.Stage | null>;
  shapeRef: (node: Konva.Rect | null) => void;
}

const RectShape: React.FC<RectShapeProps> = ({ shape, isSelected, onSelect, onChange, stageWidth, stageHeight, stageRef, shapeRef }) => {
  return (
    <Rect
      ref={shapeRef}
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      fill={shape.fill}
      fillEnabled={shape.fillEnabled}
      opacity={shape.opacity}
      stroke={shape.stroke}
      strokeWidth={shape.strokeWidth}
      draggable
      listening={true}
      hitGraphEnabled={true}
      onClick={onSelect}
      dragBoundFunc={(pos) => {
        const stagePos = stageRef.current?.position() || { x: 0, y: 0 };
        const viewportX = pos.x - stagePos.x;
        const viewportY = pos.y - stagePos.y;
        const newX = Math.max(0, Math.min(viewportX, stageWidth - shape.width)) + stagePos.x;
        const newY = Math.max(0, Math.min(viewportY, stageHeight - shape.height)) + stagePos.y;
        return { x: newX, y: newY };
      }}
      onDragEnd={(e) => {
        const newX = Math.round(e.target.x());
        const newY = Math.round(e.target.y());
        onChange({ x: newX, y: newY });
      }}
    />
  );
};

export default RectShape;