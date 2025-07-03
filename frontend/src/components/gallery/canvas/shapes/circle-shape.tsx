import React from 'react';
import { Circle } from 'react-konva';
import  Konva from 'konva'
import type { Shape } from '../../types';

interface CircleShapeProps {
  shape: Shape;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<Shape>) => void;
  stageWidth: number;
  stageHeight: number;
  stageRef: React.RefObject<Konva.Stage | null>;
  shapeRef: (node: Konva.Circle | null) => void;
}

const CircleShape: React.FC<CircleShapeProps> = ({ shape, isSelected, onSelect, onChange, stageWidth, stageHeight, stageRef, shapeRef }) => {
  const radius = shape.radius || 50;

  return (
    <Circle
      ref={shapeRef}
      x={shape.x}
      y={shape.y}
      radius={radius}
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
        const newX = Math.max(radius, Math.min(viewportX, stageWidth - radius)) + stagePos.x;
        const newY = Math.max(radius, Math.min(viewportY, stageHeight - radius)) + stagePos.y;
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

export default CircleShape;