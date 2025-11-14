import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Circle, Text as KonvaText, Image as KonvaImage, Line, Group } from 'react-konva';
import type { CanvasObject, ImageObject, SnapGuide } from '@types';
import { CanvasTransformer } from './canvas-transformer.component';
import { snapPosition } from './utils/snap.util';
import useImage from 'use-image';

type EditorMode = 'pan' | 'move' | 'select';

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
  onContextMenu?: (e: React.MouseEvent, objectId: string) => void;
  editorMode?: EditorMode;
  isPreviewMode?: boolean;
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
  onContextMenu,
  editorMode = 'move',
  isPreviewMode = false,
}: CanvasStageProps) {
  const stageRef = useRef<any>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const lastPanPos = useRef({ x: 0, y: 0 });
  const [selectionBox, setSelectionBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

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

  // Handle panning and selection
  const handleMouseDown = (e: any) => {
    const targetClass = e.target.getClassName();
    const targetId = e.target.id();

    // Don't do anything if clicking on transformer or its handles
    if (targetClass === 'Transformer' || e.target.getParent()?.getClassName() === 'Transformer') {
      console.log('[CanvasStage] Clicked on transformer, ignoring');
      return;
    }

    // Check if we clicked on a canvas object by checking if the target has an ID that matches an object
    const clickedOnObject = targetId && objects.some(obj => obj.id === targetId);

    // Also check if we clicked on a child of a Group (children have listening=false but just to be safe)
    const isChildOfGroup = e.target.getParent()?.getClassName() === 'Group' &&
                           e.target.getParent()?.id() &&
                           objects.some(obj => obj.id === e.target.getParent()?.id());

    const clickedOnEmpty = !clickedOnObject && !isChildOfGroup &&
                          (e.target === e.target.getStage() ||
                           (targetClass === 'Rect' && e.target.attrs.fill === 'white' && !targetId));

    console.log('[CanvasStage] Mouse down:', {
      targetClass,
      targetId,
      clickedOnObject,
      isChildOfGroup,
      isStage: e.target === e.target.getStage(),
      clickedOnEmpty,
      editorMode,
    });

    // Check if clicking on empty canvas (stage or background)
    if (clickedOnEmpty) {
      const stage = e.target.getStage();
      const pos = stage.getPointerPosition();

      if (editorMode === 'select') {
        // Start selection box
        setIsSelecting(true);
        const transform = stage.getAbsoluteTransform().copy().invert();
        const stagePos = transform.point(pos);

        setSelectionBox({
          x1: stagePos.x,
          y1: stagePos.y,
          x2: stagePos.x,
          y2: stagePos.y,
        });
        console.log('[CanvasStage] Started selection from:', stagePos);
      } else {
        // Start panning (both pan and move mode allow panning on empty canvas)
        setIsPanning(true);
        lastPanPos.current = { x: pos.x, y: pos.y };
        console.log('[CanvasStage] Started panning from:', lastPanPos.current);
      }

      // Deselect all
      onSelect([]);
    }
  };

  const handleMouseMove = (e: any) => {
    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (isPanning) {
      const dx = pos.x - lastPanPos.current.x;
      const dy = pos.y - lastPanPos.current.y;

      console.log('[CanvasStage] Panning delta:', { dx, dy, newPan: { x: panX + dx, y: panY + dy } });

      onPan(panX + dx, panY + dy);
      lastPanPos.current = { x: pos.x, y: pos.y };
    } else if (isSelecting && selectionBox) {
      // Update selection box
      const transform = stage.getAbsoluteTransform().copy().invert();
      const stagePos = transform.point(pos);

      setSelectionBox({
        ...selectionBox,
        x2: stagePos.x,
        y2: stagePos.y,
      });
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      console.log('[CanvasStage] Stopped panning');
      setIsPanning(false);
    } else if (isSelecting && selectionBox) {
      console.log('[CanvasStage] Stopped selecting');

      // Calculate which objects are within selection box
      const box = {
        x: Math.min(selectionBox.x1, selectionBox.x2),
        y: Math.min(selectionBox.y1, selectionBox.y2),
        width: Math.abs(selectionBox.x2 - selectionBox.x1),
        height: Math.abs(selectionBox.y2 - selectionBox.y1),
      };

      const selected = objects.filter(obj => {
        // Get object bounds
        let objX = obj.x;
        let objY = obj.y;
        let objWidth = 0;
        let objHeight = 0;

        if ('width' in obj && obj.width !== undefined) {
          objWidth = obj.width * (obj.scaleX || 1);
        }
        if ('height' in obj && obj.height !== undefined) {
          objHeight = obj.height * (obj.scaleY || 1);
        }
        if ('radius' in obj && obj.radius !== undefined) {
          const radiusX = obj.radius * (obj.scaleX || 1);
          const radiusY = obj.radius * (obj.scaleY || 1);
          objWidth = radiusX * 2;
          objHeight = radiusY * 2;
        }

        // Check if object intersects with selection box
        return !(objX + objWidth < box.x ||
                 objX > box.x + box.width ||
                 objY + objHeight < box.y ||
                 objY > box.y + box.height);
      });

      if (selected.length > 0) {
        onSelect(selected.map(obj => obj.id));
      }

      setIsSelecting(false);
      setSelectionBox(null);
    }
  };

  // Handle text editing
  const handleTextEdit = (textId: string, newText: string) => {
    onUpdateObject(textId, { text: newText });
    setEditingTextId(null);
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
              onSelectIds={onSelect}
              onUpdateObjectById={onUpdateObject}
              onContextMenu={onContextMenu}
              editorMode={editorMode}
              isPreviewMode={isPreviewMode}
              onTextEdit={setEditingTextId}
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

          {/* Selection Box */}
          {selectionBox && (
            <Rect
              x={Math.min(selectionBox.x1, selectionBox.x2)}
              y={Math.min(selectionBox.y1, selectionBox.y2)}
              width={Math.abs(selectionBox.x2 - selectionBox.x1)}
              height={Math.abs(selectionBox.y2 - selectionBox.y1)}
              fill="rgba(0, 123, 255, 0.1)"
              stroke="#007bff"
              strokeWidth={2 / zoom}
              dash={[10 / zoom, 5 / zoom]}
              listening={false}
            />
          )}

          {/* Snap Guides - More prominent visual feedback */}
          {snapGuides.map((guide, index) =>
            guide.type === 'vertical' ? (
              <Line
                key={`guide-${index}`}
                points={[guide.position, 0, guide.position, height]}
                stroke="#FF00FF"
                strokeWidth={2 / zoom}
                dash={[4 / zoom, 4 / zoom]}
                listening={false}
                opacity={0.8}
              />
            ) : (
              <Line
                key={`guide-${index}`}
                points={[0, guide.position, width, guide.position]}
                stroke="#FF00FF"
                strokeWidth={2 / zoom}
                dash={[4 / zoom, 4 / zoom]}
                listening={false}
                opacity={0.8}
              />
            )
          )}
        </Layer>
      </Stage>

      {/* Text Editing Overlay */}
      {editingTextId && (
        <TextEditor
          textObject={objects.find(obj => obj.id === editingTextId) as any}
          zoom={zoom}
          panX={panX}
          panY={panY}
          onSave={handleTextEdit}
          onCancel={() => setEditingTextId(null)}
        />
      )}
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
  onContextMenu?: (e: React.MouseEvent, objectId: string) => void;
  editorMode?: EditorMode;
  isPreviewMode?: boolean;
  onTextEdit?: (textId: string) => void;
  onSelectIds?: (ids: string[]) => void; // For child object selection
  onUpdateObjectById?: (id: string, updates: Partial<CanvasObject>) => void; // For child object updates
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
  onContextMenu,
  editorMode = 'move',
  isPreviewMode = false,
  onTextEdit,
  onSelectIds,
  onUpdateObjectById,
}: CanvasObjectRendererProps) {
  const handleDragMove = (e: any) => {
    // Skip snapping if object is being transformed (rotated/resized)
    if (isTransforming) return;

    if (!gridEnabled && !snapEnabled) return;

    const node = e.target;

    // Get object dimensions and rotation for snapping calculations
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

    const rotation = node.rotation() || 0;

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
      objHeight,
      rotation
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

  // Objects are only draggable in 'move' mode and not in preview mode
  const isDraggable = !isPreviewMode && editorMode === 'move' && object.draggable !== false;

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
          draggable={isDraggable}
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
          draggable={isDraggable}
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
          draggable={isDraggable}
          onClick={onSelect}
          onTap={onSelect}
          onDblClick={() => onTextEdit?.(object.id)}
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
          editorMode={editorMode}
          isPreviewMode={isPreviewMode}
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
          draggable={isDraggable}
          onClick={onSelect}
          onTap={onSelect}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        />
      );

    case 'triangle':
    case 'star':
    case 'diamond':
      const shapeObj = object as any;
      return (
        <Line
          id={object.id}
          x={object.x}
          y={object.y}
          points={shapeObj.points}
          fill={shapeObj.fill === 'transparent' ? undefined : shapeObj.fill}
          stroke={shapeObj.stroke}
          strokeWidth={shapeObj.strokeWidth}
          closed={shapeObj.closed}
          rotation={object.rotation}
          scaleX={object.scaleX}
          scaleY={object.scaleY}
          opacity={object.opacity}
          draggable={isDraggable}
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
          draggable={isDraggable}
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
              isPreviewMode={isPreviewMode}
              onTextEdit={onTextEdit}
            />
          ))}
        </Group>
      );

    case 'group':
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
          draggable={isDraggable}
          onClick={onSelect}
          onTap={onSelect}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onContextMenu={(e: any) => {
            if (onContextMenu) {
              e.evt.preventDefault();
              const syntheticEvent = {
                preventDefault: () => e.evt.preventDefault(),
                clientX: e.evt.clientX,
                clientY: e.evt.clientY,
              } as React.MouseEvent;
              onContextMenu(syntheticEvent, object.id);
            }
          }}
        >
          {/* Render children - listening enabled so they can capture clicks for individual selection */}
          {object.children?.map((child) => {
            // Skip rendering if child is hidden
            if (child.visible === false) {
              return null;
            }

            const handleChildClick = (e: any) => {
              e.cancelBubble = true; // Prevent group from being selected
              if (onSelectIds) {
                onSelectIds([child.id]);
              }
            };

            // Render children with their own click handlers for individual selection
            switch (child.type) {
              case 'rect':
                return (
                  <Rect
                    key={child.id}
                    id={child.id}
                    x={child.x}
                    y={child.y}
                    width={(child as any).width}
                    height={(child as any).height}
                    fill={(child as any).fill}
                    stroke={(child as any).stroke}
                    strokeWidth={(child as any).strokeWidth}
                    cornerRadius={(child as any).cornerRadius}
                    rotation={child.rotation}
                    scaleX={child.scaleX}
                    scaleY={child.scaleY}
                    opacity={child.opacity}
                    listening={true}
                    onClick={handleChildClick}
                    onTap={handleChildClick}
                  />
                );
              case 'circle':
                return (
                  <Circle
                    key={child.id}
                    id={child.id}
                    x={child.x}
                    y={child.y}
                    radius={(child as any).radius}
                    fill={(child as any).fill}
                    stroke={(child as any).stroke}
                    strokeWidth={(child as any).strokeWidth}
                    rotation={child.rotation}
                    scaleX={child.scaleX}
                    scaleY={child.scaleY}
                    opacity={child.opacity}
                    listening={true}
                    onClick={handleChildClick}
                    onTap={handleChildClick}
                  />
                );
              case 'text':
                return (
                  <KonvaText
                    key={child.id}
                    id={child.id}
                    x={child.x}
                    y={child.y}
                    text={(child as any).text}
                    fontSize={(child as any).fontSize}
                    fontFamily={(child as any).fontFamily}
                    fill={(child as any).fill}
                    rotation={child.rotation}
                    scaleX={child.scaleX}
                    scaleY={child.scaleY}
                    opacity={child.opacity}
                    listening={true}
                    onClick={handleChildClick}
                    onTap={handleChildClick}
                  />
                );
              case 'line':
                return (
                  <Line
                    key={child.id}
                    id={child.id}
                    x={child.x}
                    y={child.y}
                    points={(child as any).points}
                    stroke={(child as any).stroke}
                    strokeWidth={(child as any).strokeWidth}
                    rotation={child.rotation}
                    scaleX={child.scaleX}
                    scaleY={child.scaleY}
                    opacity={child.opacity}
                    listening={true}
                    onClick={handleChildClick}
                    onTap={handleChildClick}
                  />
                );
              case 'triangle':
              case 'star':
              case 'diamond':
                const childShapeObj = child as any;
                return (
                  <Line
                    key={child.id}
                    id={child.id}
                    x={child.x}
                    y={child.y}
                    points={childShapeObj.points}
                    fill={childShapeObj.fill === 'transparent' ? undefined : childShapeObj.fill}
                    stroke={childShapeObj.stroke}
                    strokeWidth={childShapeObj.strokeWidth}
                    closed={childShapeObj.closed}
                    rotation={child.rotation}
                    scaleX={child.scaleX}
                    scaleY={child.scaleY}
                    opacity={child.opacity}
                    listening={true}
                    onClick={handleChildClick}
                    onTap={handleChildClick}
                  />
                );
              case 'image':
                // For images in groups, render simple placeholder
                return (
                  <Rect
                    key={child.id}
                    id={child.id}
                    x={child.x}
                    y={child.y}
                    width={(child as any).width}
                    height={(child as any).height}
                    fill="#ddd"
                    stroke="#999"
                    strokeWidth={1}
                    rotation={child.rotation}
                    scaleX={child.scaleX}
                    scaleY={child.scaleY}
                    opacity={child.opacity}
                    listening={true}
                    onClick={handleChildClick}
                    onTap={handleChildClick}
                  />
                );
              default:
                return null;
            }
          })}
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
  editorMode = 'move',
  isPreviewMode = false,
}: CanvasObjectRendererProps) {
  const imageObj = object as ImageObject;
  const [image] = useImage(imageObj.src, 'anonymous');

  const handleDragMove = (e: any) => {
    // Skip snapping if object is being transformed (rotated/resized)
    if (isTransforming) return;

    if (!gridEnabled && !snapEnabled) return;

    const node = e.target;

    // Get object dimensions and rotation for snapping calculations
    const objWidth = node.width() * (node.scaleX() || 1);
    const objHeight = node.height() * (node.scaleY() || 1);
    const rotation = node.rotation() || 0;

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
      objHeight,
      rotation
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

  // Objects are only draggable in 'move' mode and not in preview mode
  const isDraggable = !isPreviewMode && editorMode === 'move' && object.draggable !== false;

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
      draggable={isDraggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    />
  );
}

// Text Editor Component
interface TextEditorProps {
  textObject: any;
  zoom: number;
  panX: number;
  panY: number;
  onSave: (id: string, text: string) => void;
  onCancel: () => void;
}

function TextEditor({ textObject, zoom, panX, panY, onSave, onCancel }: TextEditorProps) {
  const [value, setValue] = useState(textObject.text || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus and select text on mount
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave(textObject.id, value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  // Calculate position accounting for zoom and pan
  const x = textObject.x * zoom + panX;
  const y = textObject.y * zoom + panY;
  const fontSize = (textObject.fontSize || 16) * zoom * (textObject.scaleX || 1);
  const width = (textObject.width || 200) * zoom * (textObject.scaleX || 1);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSave(textObject.id, value)}
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        fontSize: `${fontSize}px`,
        fontFamily: textObject.fontFamily || 'Arial',
        color: textObject.fill || '#000000',
        background: 'transparent',
        border: '2px solid #007bff',
        padding: '4px',
        resize: 'none',
        outline: 'none',
        overflow: 'hidden',
        lineHeight: '1.2',
        fontStyle: textObject.fontStyle === 'italic' ? 'italic' : 'normal',
        fontWeight: textObject.fontStyle === 'bold' ? 'bold' : 'normal',
        textDecoration: textObject.textDecoration || 'none',
        textAlign: (textObject.align as 'left' | 'center' | 'right') || 'left',
      }}
    />
  );
}
