import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Circle, Text as KonvaText, Image as KonvaImage, Line, Group } from 'react-konva';
import type { CanvasObject, ImageObject, SnapGuide } from '@types';
import { CanvasTransformer } from './CanvasTransformer';
import useImage from 'use-image';

interface CanvasStageProps {
  objects: CanvasObject[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onUpdateObject: (id: string, updates: Partial<CanvasObject>) => void;
  zoom: number;
  panX: number;
  panY: number;
  onZoom: (zoom: number) => void;
  onPan: (x: number, y: number) => void;
  width: number;
  height: number;
  gridEnabled?: boolean;
  snapGuides?: SnapGuide[];
}

export function CanvasStage({
  objects,
  selectedIds,
  onSelect,
  onUpdateObject,
  zoom,
  panX,
  panY,
  onZoom,
  onPan,
  width,
  height,
  gridEnabled = false,
  snapGuides = [],
}: CanvasStageProps) {
  const stageRef = useRef<any>(null);
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPos = useRef({ x: 0, y: 0 });

  // Handle wheel zoom
  const handleWheel = (e: any) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = zoom;
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - panX) / oldScale,
      y: (pointer.y - panY) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = Math.max(0.2, Math.min(3, oldScale + direction * 0.1));

    onZoom(newScale);

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    onPan(newPos.x, newPos.y);
  };

  // Handle panning
  const handleMouseDown = (e: any) => {
    // Check if clicking on empty canvas (stage)
    if (e.target === e.target.getStage()) {
      setIsPanning(true);
      const pos = e.target.getStage().getPointerPosition();
      lastPanPos.current = { x: pos.x, y: pos.y };

      // Deselect all
      onSelect([]);
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isPanning) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    const dx = pos.x - lastPanPos.current.x;
    const dy = pos.y - lastPanPos.current.y;

    onPan(panX + dx, panY + dy);
    lastPanPos.current = { x: pos.x, y: pos.y };
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  return (
    <div className="relative bg-gray-100 dark:bg-gray-900 overflow-hidden">
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight - 100}
        scaleX={zoom}
        scaleY={zoom}
        x={panX}
        y={panY}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        draggable={false}
      >
        <Layer>
          {/* Background */}
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="white"
          />

          {/* Grid */}
          {gridEnabled && <CanvasGrid width={width} height={height} />}

          {/* Canvas Objects */}
          {objects.map((obj) => (
            <CanvasObjectRenderer
              key={obj.id}
              object={obj}
              isSelected={selectedIds.includes(obj.id)}
              onSelect={() => onSelect([obj.id])}
              onUpdate={(updates) => onUpdateObject(obj.id, updates)}
            />
          ))}

          {/* Transformer for selected objects */}
          <CanvasTransformer
            selectedIds={selectedIds}
            objects={objects}
            onUpdate={onUpdateObject}
          />

          {/* Snap Guides */}
          {snapGuides.map((guide, index) =>
            guide.type === 'vertical' ? (
              <Line
                key={`guide-${index}`}
                points={[guide.position, 0, guide.position, height]}
                stroke="blue"
                strokeWidth={1 / zoom}
                dash={[10 / zoom, 5 / zoom]}
              />
            ) : (
              <Line
                key={`guide-${index}`}
                points={[0, guide.position, width, guide.position]}
                stroke="blue"
                strokeWidth={1 / zoom}
                dash={[10 / zoom, 5 / zoom]}
              />
            )
          )}
        </Layer>
      </Stage>
    </div>
  );
}

// Grid Component
function CanvasGrid({ width, height }: { width: number; height: number }) {
  const gridSize = 20;
  const lines: React.JSX.Element[] = [];

  // Vertical lines
  for (let i = 0; i <= width / gridSize; i++) {
    lines.push(
      <Line
        key={`v-${i}`}
        points={[i * gridSize, 0, i * gridSize, height]}
        stroke="#ddd"
        strokeWidth={0.5}
      />
    );
  }

  // Horizontal lines
  for (let i = 0; i <= height / gridSize; i++) {
    lines.push(
      <Line
        key={`h-${i}`}
        points={[0, i * gridSize, width, i * gridSize]}
        stroke="#ddd"
        strokeWidth={0.5}
      />
    );
  }

  return <>{lines}</>;
}

// Canvas Object Renderer
interface CanvasObjectRendererProps {
  object: CanvasObject;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<CanvasObject>) => void;
}

function CanvasObjectRenderer({ object, isSelected, onSelect, onUpdate }: CanvasObjectRendererProps) {
  const handleDragEnd = (e: any) => {
    onUpdate({
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  switch (object.type) {
    case 'rect':
      return (
        <Rect
          id={object.id}
          x={object.x}
          y={object.y}
          width={object.width}
          height={object.height}
          fill={object.fill}
          stroke={object.stroke}
          strokeWidth={object.strokeWidth}
          cornerRadius={object.cornerRadius}
          rotation={object.rotation}
          scaleX={object.scaleX}
          scaleY={object.scaleY}
          opacity={object.opacity}
          draggable={object.draggable !== false}
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={handleDragEnd}
        />
      );

    case 'circle':
      return (
        <Circle
          id={object.id}
          x={object.x}
          y={object.y}
          radius={object.radius}
          fill={object.fill}
          stroke={object.stroke}
          strokeWidth={object.strokeWidth}
          rotation={object.rotation}
          scaleX={object.scaleX}
          scaleY={object.scaleY}
          opacity={object.opacity}
          draggable={object.draggable !== false}
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={handleDragEnd}
        />
      );

    case 'text':
      return (
        <KonvaText
          id={object.id}
          x={object.x}
          y={object.y}
          text={object.text}
          fontSize={object.fontSize}
          fontFamily={object.fontFamily}
          fill={object.fill}
          fontStyle={object.fontStyle}
          textDecoration={object.textDecoration}
          align={object.align}
          width={object.width}
          rotation={object.rotation}
          scaleX={object.scaleX}
          scaleY={object.scaleY}
          opacity={object.opacity}
          draggable={object.draggable !== false}
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={handleDragEnd}
        />
      );

    case 'image':
      return <ImageRenderer object={object} isSelected={isSelected} onSelect={onSelect} onUpdate={onUpdate} />;

    case 'line':
      return (
        <Line
          id={object.id}
          x={object.x}
          y={object.y}
          points={object.points}
          stroke={object.stroke}
          strokeWidth={object.strokeWidth}
          lineCap={object.lineCap as any}
          lineJoin={object.lineJoin as any}
          rotation={object.rotation}
          scaleX={object.scaleX}
          scaleY={object.scaleY}
          opacity={object.opacity}
          draggable={object.draggable !== false}
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={handleDragEnd}
        />
      );

    case 'gallery-item':
      return (
        <Group
          id={object.id}
          x={object.x}
          y={object.y}
          width={object.width}
          height={object.height}
          rotation={object.rotation}
          scaleX={object.scaleX}
          scaleY={object.scaleY}
          opacity={object.opacity}
          draggable={object.draggable !== false}
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={handleDragEnd}
        >
          <Rect
            width={object.width}
            height={object.height}
            fill={object.background || 'white'}
            stroke={object.borderColor}
            strokeWidth={object.borderWidth}
          />
          {/* Render children */}
          {object.children?.map((child) => (
            <CanvasObjectRenderer
              key={child.id}
              object={child}
              isSelected={false}
              onSelect={() => {}}
              onUpdate={() => {}}
            />
          ))}
        </Group>
      );

    default:
      return null;
  }
}

// Image Renderer with loading
function ImageRenderer({ object, isSelected, onSelect, onUpdate }: CanvasObjectRendererProps) {
  const imageObj = object as ImageObject;
  const [image] = useImage(imageObj.src, 'anonymous');

  const handleDragEnd = (e: any) => {
    onUpdate({
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  if (!image) {
    // Show loading placeholder
    return (
      <Rect
        id={object.id}
        x={object.x}
        y={object.y}
        width={imageObj.width}
        height={imageObj.height}
        fill="#f0f0f0"
        stroke="#ccc"
        strokeWidth={1}
      />
    );
  }

  return (
    <KonvaImage
      id={object.id}
      x={object.x}
      y={object.y}
      image={image}
      width={imageObj.width}
      height={imageObj.height}
      rotation={object.rotation}
      scaleX={object.scaleX}
      scaleY={object.scaleY}
      opacity={object.opacity}
      draggable={object.draggable !== false}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={handleDragEnd}
    />
  );
}
