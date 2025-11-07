import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Circle, Text as KonvaText, Image as KonvaImage, Line, Group } from 'react-konva';
import type { CanvasObject, ImageObject, SnapGuide } from '@types';
import { CanvasTransformer } from './CanvasTransformer';
import { snapPosition } from '@utils/snapUtils';
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
  snapEnabled?: boolean;
  snapGuides?: SnapGuide[];
  onSnapGuidesChange?: (guides: SnapGuide[]) => void;
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
  snapEnabled = false,
  snapGuides = [],
  onSnapGuidesChange,
}: CanvasStageProps) {
  const stageRef = useRef<any>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
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
    const targetClass = e.target.getClassName();

    // Don't do anything if clicking on transformer or its handles
    if (targetClass === 'Transformer' || e.target.getParent()?.getClassName() === 'Transformer') {
      console.log('[CanvasStage] Clicked on transformer, ignoring');
      return;
    }

    const clickedOnEmpty = e.target === e.target.getStage() || (targetClass === 'Rect' && e.target.attrs.fill === 'white');

    console.log('[CanvasStage] Mouse down:', {
      targetClass,
      isStage: e.target === e.target.getStage(),
      clickedOnEmpty,
    });

    // Check if clicking on empty canvas (stage or background)
    if (clickedOnEmpty) {
      setIsPanning(true);
      const pos = e.target.getStage().getPointerPosition();
      lastPanPos.current = { x: pos.x, y: pos.y };
      console.log('[CanvasStage] Started panning from:', lastPanPos.current);

      // Deselect all
      onSelect([]);
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isPanning) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    const dx = pos.x - lastPanPos.current.x;
    const dy = pos.y - lastPanPos.current.y;

    console.log('[CanvasStage] Panning delta:', { dx, dy, newPan: { x: panX + dx, y: panY + dy } });

    onPan(panX + dx, panY + dy);
    lastPanPos.current = { x: pos.x, y: pos.y };
  };

  const handleMouseUp = () => {
    if (isPanning) {
      console.log('[CanvasStage] Stopped panning');
    }
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
        onMouseLeave={handleMouseUp}
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
              allObjects={objects}
              isSelected={selectedIds.includes(obj.id)}
              onSelect={() => onSelect([obj.id])}
              onUpdate={(updates) => onUpdateObject(obj.id, updates)}
              gridEnabled={gridEnabled}
              snapEnabled={snapEnabled}
              canvasWidth={width}
              canvasHeight={height}
              onSnapGuidesChange={onSnapGuidesChange}
              isTransforming={isTransforming}
            />
          ))}

          {/* Transformer for selected objects */}
          <CanvasTransformer
            selectedIds={selectedIds}
            objects={objects}
            onUpdate={onUpdateObject}
            onTransformStart={() => setIsTransforming(true)}
            onTransformEnd={() => setIsTransforming(false)}
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
                listening={false}
              />
            ) : (
              <Line
                key={`guide-${index}`}
                points={[0, guide.position, width, guide.position]}
                stroke="blue"
                strokeWidth={1 / zoom}
                dash={[10 / zoom, 5 / zoom]}
                listening={false}
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
  allObjects: CanvasObject[];
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<CanvasObject>) => void;
  gridEnabled?: boolean;
  snapEnabled?: boolean;
  canvasWidth: number;
  canvasHeight: number;
  onSnapGuidesChange?: (guides: SnapGuide[]) => void;
  isTransforming?: boolean;
}

function CanvasObjectRenderer({
  object,
  allObjects,
  isSelected,
  onSelect,
  onUpdate,
  gridEnabled = false,
  snapEnabled = false,
  canvasWidth,
  canvasHeight,
  onSnapGuidesChange,
  isTransforming = false,
}: CanvasObjectRendererProps) {
  const handleDragMove = (e: any) => {
    // Skip snapping if object is being transformed (rotated/resized)
    if (isTransforming) return;

    if (!gridEnabled && !snapEnabled) return;

    const node = e.target;

    // Get object dimensions for snapping calculations
    // Handle circles differently (they use radius instead of width/height)
    let objWidth: number;
    let objHeight: number;

    if (object.type === 'circle') {
      const radius = node.radius() * (node.scaleX() || 1);
      objWidth = radius * 2;
      objHeight = radius * 2;
    } else {
      objWidth = (node.width?.() || 0) * (node.scaleX() || 1);
      objHeight = (node.height?.() || 0) * (node.scaleY() || 1);
    }

    const result = snapPosition(
      node.x(),
      node.y(),
      gridEnabled,
      snapEnabled,
      allObjects,
      object.id,
      canvasWidth,
      canvasHeight,
      objWidth,
      objHeight
    );

    // Apply snapped position
    node.position({ x: result.x, y: result.y });

    // Update snap guides
    if (onSnapGuidesChange) {
      onSnapGuidesChange(result.guides);
    }
  };

  const handleDragEnd = (e: any) => {
    // Clear snap guides
    if (onSnapGuidesChange) {
      onSnapGuidesChange([]);
    }

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
          onDragMove={handleDragMove}
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
          onDragMove={handleDragMove}
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
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        />
      );

    case 'image':
      return (
        <ImageRenderer
          object={object}
          allObjects={allObjects}
          isSelected={isSelected}
          onSelect={onSelect}
          onUpdate={onUpdate}
          gridEnabled={gridEnabled}
          snapEnabled={snapEnabled}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          onSnapGuidesChange={onSnapGuidesChange}
          isTransforming={isTransforming}
        />
      );

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
          onDragMove={handleDragMove}
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
          onDragMove={handleDragMove}
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
              allObjects={allObjects}
              isSelected={false}
              onSelect={() => {}}
              onUpdate={() => {}}
              gridEnabled={gridEnabled}
              snapEnabled={snapEnabled}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              onSnapGuidesChange={onSnapGuidesChange}
              isTransforming={isTransforming}
            />
          ))}
        </Group>
      );

    default:
      return null;
  }
}

// Image Renderer with loading
function ImageRenderer({
  object,
  allObjects,
  isSelected,
  onSelect,
  onUpdate,
  gridEnabled = false,
  snapEnabled = false,
  canvasWidth,
  canvasHeight,
  onSnapGuidesChange,
  isTransforming = false,
}: CanvasObjectRendererProps) {
  const imageObj = object as ImageObject;
  const [image] = useImage(imageObj.src, 'anonymous');

  const handleDragMove = (e: any) => {
    // Skip snapping if object is being transformed (rotated/resized)
    if (isTransforming) return;

    if (!gridEnabled && !snapEnabled) return;

    const node = e.target;

    // Get object dimensions for snapping calculations
    const objWidth = node.width() * (node.scaleX() || 1);
    const objHeight = node.height() * (node.scaleY() || 1);

    const result = snapPosition(
      node.x(),
      node.y(),
      gridEnabled,
      snapEnabled,
      allObjects,
      object.id,
      canvasWidth,
      canvasHeight,
      objWidth,
      objHeight
    );

    node.position({ x: result.x, y: result.y });

    if (onSnapGuidesChange) {
      onSnapGuidesChange(result.guides);
    }
  };

  const handleDragEnd = (e: any) => {
    if (onSnapGuidesChange) {
      onSnapGuidesChange([]);
    }

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
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    />
  );
}
