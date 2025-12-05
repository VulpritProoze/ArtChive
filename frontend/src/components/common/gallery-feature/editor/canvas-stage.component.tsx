import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Circle, Text as KonvaText, Image as KonvaImage, Line, Group } from 'react-konva';
import type { CanvasObject, ImageObject, FrameObject, SnapGuide } from '@types';
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
  onCanvasContextMenu?: (e: React.MouseEvent) => void;
  onAttachImageToFrame?: (imageId: string, frameId: string) => void;
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
  onCanvasContextMenu,
  onAttachImageToFrame,
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
  const [rotationInfo, setRotationInfo] = useState<{ angle: number; x: number; y: number; isSnapped: boolean } | null>(null);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [hoveredFrameId, setHoveredFrameId] = useState<string | null>(null);
  const [previewImageId, setPreviewImageId] = useState<string | null>(null); // For preview when dragging over frame

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

  // Handle right-click context menu
  const handleStageContextMenu = (e: any) => {
    e.evt.preventDefault();
    const targetId = e.target.id();
    const clickedOnObject = targetId && objects.some(obj => obj.id === targetId);

    // Check if clicked on a child of a Group
    const isChildOfGroup = e.target.getParent()?.getClassName() === 'Group' &&
                           e.target.getParent()?.id() &&
                           objects.some(obj => obj.id === e.target.getParent()?.id());

    const clickedOnEmpty = !clickedOnObject && !isChildOfGroup;

    if (clickedOnEmpty && onCanvasContextMenu) {
      // Right-click on empty canvas
      const syntheticEvent = {
        preventDefault: () => e.evt.preventDefault(),
        clientX: e.evt.clientX,
        clientY: e.evt.clientY,
      } as React.MouseEvent;
      onCanvasContextMenu(syntheticEvent);
    }
  };

  // Handle panning and selection
  const handleMouseDown = (e: any) => {
    const targetClass = e.target.getClassName();
    const targetId = e.target.id();

    // Don't do anything if clicking on transformer or its handles
    if (targetClass === 'Transformer' || e.target.getParent()?.getClassName() === 'Transformer') {
      return;
    }

    // Check if we clicked on a canvas object by checking if the target has an ID that matches an object
    const clickedOnObject = targetId && objects.some(obj => obj.id === targetId);

    // Also check if we clicked on a child of a Group (children have listening=false but just to be safe)
    const isChildOfGroup = e.target.getParent()?.getClassName() === 'Group' &&
                           e.target.getParent()?.id() &&
                           objects.some(obj => obj.id === e.target.getParent()?.id());
    
    // Frame children are not selectable on canvas - only via layers panel
    // So we don't need to check for frame children here

    const clickedOnEmpty = !clickedOnObject && !isChildOfGroup &&
                          (e.target === e.target.getStage() ||
                           (targetClass === 'Rect' && e.target.attrs.fill === 'white' && !targetId));


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
      } else {
        // Start panning (both pan and move mode allow panning on empty canvas)
        setIsPanning(true);
        lastPanPos.current = { x: pos.x, y: pos.y };
      }

      // Deselect all
      onSelect([]);
    }
  };

  const handleMouseMove = () => {
    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (isPanning) {
      const dx = pos.x - lastPanPos.current.x;
      const dy = pos.y - lastPanPos.current.y;

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
      setIsPanning(false);
    } else if (isSelecting && selectionBox) {

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
        onContextMenu={handleStageContextMenu}
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
              selectedIds={selectedIds}
              onSelect={() => onSelect([obj.id])}
              draggedImageId={draggedImageId}
              setDraggedImageId={setDraggedImageId}
              hoveredFrameId={hoveredFrameId}
              setHoveredFrameId={setHoveredFrameId}
              previewImageId={previewImageId}
              setPreviewImageId={setPreviewImageId}
              onAttachImageToFrame={onAttachImageToFrame}
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
            onTransformEnd={() => {
              setIsTransforming(false);
              setRotationInfo(null); // Clear rotation info when transform ends
            }}
            onRotate={(angle, x, y, isSnapped) => {
              setRotationInfo({ angle, x, y, isSnapped });
            }}
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

          {/* Snap Guides - Color-coded for snap type */}
          {snapGuides.map((guide, index) => {
            // Choose color and style based on snap type
            const getSnapColor = () => {
              switch (guide.snapType) {
                case 'grid':
                  return '#FF00FF'; // Magenta dashed for grid snaps
                case 'canvas-center':
                  return '#00FF00'; // Green solid for canvas center
                case 'object':
                  return '#0099FF'; // Blue for object snaps
                default:
                  return '#FF00FF'; // Default magenta
              }
            };

            const color = getSnapColor();
            const strokeWidth = guide.snapType === 'canvas-center' ? 3 / zoom : 2 / zoom; // Thicker for canvas center
            const dash = guide.snapType === 'canvas-center' ? [] : [4 / zoom, 4 / zoom]; // Solid for canvas center, dashed for others

            return guide.type === 'vertical' ? (
              <Line
                key={`guide-${index}`}
                points={[guide.position, 0, guide.position, height]}
                stroke={color}
                strokeWidth={strokeWidth}
                dash={dash}
                listening={false}
                opacity={0.9}
              />
            ) : (
              <Line
                key={`guide-${index}`}
                points={[0, guide.position, width, guide.position]}
                stroke={color}
                strokeWidth={strokeWidth}
                dash={dash}
                listening={false}
                opacity={0.9}
              />
            );
          })}
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

      {/* Rotation Angle Indicator */}
      {rotationInfo && (
        <div
          style={{
            position: 'absolute',
            left: `${panX + rotationInfo.x * zoom}px`,
            top: `${panY + rotationInfo.y * zoom - 40}px`,
            background: rotationInfo.isSnapped ? '#00FF00' : '#333',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            transition: 'background 0.1s ease',
          }}
        >
          {Math.round(rotationInfo.angle)}°
          {rotationInfo.isSnapped && ' ✓'}
        </div>
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
  selectedIds?: string[]; // All selected IDs (for checking frame children)
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
  draggedImageId?: string | null;
  setDraggedImageId?: (id: string | null) => void;
  hoveredFrameId?: string | null;
  setHoveredFrameId?: (id: string | null) => void;
  previewImageId?: string | null;
  setPreviewImageId?: (id: string | null) => void;
  onAttachImageToFrame?: (imageId: string, frameId: string) => void;
}

function CanvasObjectRenderer({
  object,
  allObjects,
  isSelected,
  selectedIds = [],
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
  draggedImageId,
  setDraggedImageId,
  hoveredFrameId,
  setHoveredFrameId,
  previewImageId,
  setPreviewImageId,
  onAttachImageToFrame,
}: CanvasObjectRendererProps) {
  const handleDragMove = (e: any) => {
    // Skip snapping if object is being transformed (rotated/resized)
    if (isTransforming) return;

    if (!gridEnabled && !snapEnabled) return;

    const node = e.target;

    // Get object dimensions and rotation for snapping calculations
    // Handle circles differently (they use radius instead of width/height)
    // For frames, always use stored dimensions (not node dimensions which may include children)
    let objWidth: number;
    let objHeight: number;

    if (object.type === 'frame') {
      // For frames, use stored dimensions to ensure snap guides are centered on frame, not image
      objWidth = object.width * (object.scaleX || 1);
      objHeight = object.height * (object.scaleY || 1);
    } else if (object.type === 'circle') {
      const radius = node.radius() * (node.scaleX() || 1);
      objWidth = radius * 2;
      objHeight = radius * 2;
    } else if (object.type === 'text') {
      // For text objects, use actual rendered dimensions
      // textWidth gives the actual rendered width of the text content (property, not method)
      // textHeight gives the actual rendered height (property, not method)
      // If width property is set (for text wrapping), use that; otherwise use textWidth
      const textObj = object as any;
      const explicitWidth = node.width?.() || textObj.width || 0;
      const textWidth = (node as any).textWidth || 0;
      const textHeight = (node as any).textHeight || 0;
      
      // Fallback: if textWidth/textHeight are 0 or undefined, estimate from object properties
      let finalWidth: number;
      let finalHeight: number;
      
      if (textWidth > 0) {
        // Use explicit width if set and larger than textWidth (for wrapped text)
        // Otherwise use textWidth (actual text content width)
        finalWidth = explicitWidth > 0 && explicitWidth >= textWidth ? explicitWidth : textWidth;
      } else if (explicitWidth > 0) {
        // Use explicit width if textWidth is not available
        finalWidth = explicitWidth;
      } else {
        // Fallback: estimate from text content and font size
        const fontSize = textObj.fontSize || 16;
        const text = textObj.text || '';
        finalWidth = Math.max(50, text.length * fontSize * 0.6); // Rough estimate
      }
      
      if (textHeight > 0) {
        finalHeight = textHeight;
      } else {
        // Fallback: estimate from font size
        const fontSize = textObj.fontSize || 16;
        // Account for multi-line text
        const text = textObj.text || '';
        const lineCount = (text.match(/\n/g) || []).length + 1;
        finalHeight = fontSize * 1.2 * lineCount; // Line height multiplier
      }
      
      // Ensure we always have valid dimensions (never 0)
      objWidth = Math.max(1, finalWidth * (node.scaleX() || 1));
      objHeight = Math.max(1, finalHeight * (node.scaleY() || 1));
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

    // Check if this is an image being dropped on a frame
    if (object.type === 'image' && draggedImageId === object.id && hoveredFrameId && onAttachImageToFrame) {
      onAttachImageToFrame(object.id, hoveredFrameId);
      if (setDraggedImageId) {
        setDraggedImageId(null);
      }
      if (setHoveredFrameId) {
        setHoveredFrameId(null);
      }
    }
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
      // Skip rendering if image is attached to a frame (it will be rendered inside the frame)
      const isAttachedToFrame = allObjects.some(
        obj => obj.type === 'frame' && (obj as FrameObject).children && (obj as FrameObject).children.some(child => child.id === object.id)
      );
      if (isAttachedToFrame) {
        return null;
      }
      
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
          draggedImageId={draggedImageId}
          setDraggedImageId={setDraggedImageId}
          setHoveredFrameId={setHoveredFrameId}
          hoveredFrameId={hoveredFrameId}
          previewImageId={previewImageId}
          setPreviewImageId={setPreviewImageId}
          onAttachImageToFrame={onAttachImageToFrame}
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
          hitStrokeWidth={Math.max(20, object.strokeWidth || 2)}
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

    // @ts-expect-error - triangle/star/diamond are in gallery.type.ts but not canvas.ts
    case 'triangle':
    // @ts-expect-error - triangle/star/diamond are in gallery.type.ts but not canvas.ts
    case 'star':
    // @ts-expect-error - triangle/star/diamond are in gallery.type.ts but not canvas.ts
    case 'diamond':
      // Type assertion needed because triangle/star/diamond are in gallery.type.ts but not canvas.ts
      // Cast to any to bypass type checking for these extended types
      const shapeObj = object as any;
      if (!shapeObj.points || shapeObj.points.length < 4) {
        return null;
      }
      return (
        <Line
          id={shapeObj.id}
          x={shapeObj.x}
          y={shapeObj.y}
          points={shapeObj.points}
          fill={shapeObj.fill === 'transparent' ? undefined : shapeObj.fill}
          stroke={shapeObj.stroke}
          strokeWidth={shapeObj.strokeWidth}
          closed={shapeObj.closed}
          rotation={shapeObj.rotation}
          scaleX={shapeObj.scaleX}
          scaleY={shapeObj.scaleY}
          opacity={shapeObj.opacity}
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
          {/* Render children - listening enabled for group hitbox, no handlers so group gets selected */}
          {object.children?.map((child) => {
            // Skip rendering if child is hidden
            if (child.visible === false) {
              return null;
            }

            // Render children with listening=true but no click handlers
            // This makes them part of the group's clickable area
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
                    fontStyle={(child as any).fontStyle}
                    textDecoration={(child as any).textDecoration}
                    align={(child as any).align}
                    width={(child as any).width}
                    rotation={child.rotation}
                    scaleX={child.scaleX}
                    scaleY={child.scaleY}
                    opacity={child.opacity}
                    listening={true}
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
                    hitStrokeWidth={Math.max(20, (child as any).strokeWidth || 2)}
                    lineCap={(child as any).lineCap}
                    lineJoin={(child as any).lineJoin}
                    rotation={child.rotation}
                    scaleX={child.scaleX}
                    scaleY={child.scaleY}
                    opacity={child.opacity}
                    listening={true}
                  />
                );
              // @ts-expect-error - triangle/star/diamond are in gallery.type.ts but not canvas.ts
              case 'triangle':
              // @ts-expect-error - triangle/star/diamond are in gallery.type.ts but not canvas.ts
              case 'star':
              // @ts-expect-error - triangle/star/diamond are in gallery.type.ts but not canvas.ts
              case 'diamond':
                // Type assertion needed because triangle/star/diamond are in gallery.type.ts but not canvas.ts
                // Cast to any to bypass type checking for these extended types
                const childShapeObj = child as any;
                if (!childShapeObj.points || childShapeObj.points.length < 4) {
                  return null;
                }
                return (
                  <Line
                    key={childShapeObj.id}
                    id={childShapeObj.id}
                    x={childShapeObj.x}
                    y={childShapeObj.y}
                    points={childShapeObj.points}
                    fill={childShapeObj.fill === 'transparent' ? undefined : childShapeObj.fill}
                    stroke={childShapeObj.stroke}
                    strokeWidth={childShapeObj.strokeWidth}
                    closed={childShapeObj.closed}
                    rotation={childShapeObj.rotation}
                    scaleX={childShapeObj.scaleX}
                    scaleY={childShapeObj.scaleY}
                    opacity={childShapeObj.opacity}
                    listening={true}
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
                  />
                );
              default:
                return null;
            }
          })}
        </Group>
      );

    case 'frame':
      const isHovered = hoveredFrameId === object.id;
      const frameObj = object as FrameObject;
      // Get the image child (frames can only have one image child)
      const attachedImage = frameObj.children && frameObj.children.length > 0 && frameObj.children[0].type === 'image'
        ? frameObj.children[0] as ImageObject
        : undefined;
      
      // Find preview image if dragging over this frame
      const previewImage = (isHovered && previewImageId && (!attachedImage || previewImageId !== attachedImage.id))
        ? allObjects.find(obj => obj.id === previewImageId && obj.type === 'image') as ImageObject | undefined
        : undefined;
      
      // Check if frame child is selected (need to check selectedIds from parent scope)
      // We'll need to pass selectedIds down or check it in FrameImageRenderer
      
      return (
        <Group
          id={object.id}
          x={object.x}
          y={object.y}
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
          {/* Frame rectangle with dashed border */}
          <Rect
            width={object.width}
            height={object.height}
            fill={isHovered ? 'rgba(79, 70, 229, 0.2)' : (object.fill || 'rgba(200, 200, 255, 0.1)')}
            stroke={isHovered ? '#6366F1' : (object.stroke || '#4F46E5')}
            strokeWidth={isHovered ? 3 : (object.strokeWidth || 2)}
            dash={object.dashEnabled !== false ? [10, 5] : undefined}
            cornerRadius={4}
          />

          {/* Render preview image when dragging over frame (semi-transparent) */}
          {previewImage && !attachedImage && (
            <FrameImagePreviewRenderer
              imageObject={previewImage}
              frameObject={frameObj}
            />
          )}

          {/* Render attached image child inside frame */}
          {attachedImage && (
            <FrameImageRenderer
              imageObject={attachedImage}
              frameObject={frameObj}
              selectedIds={selectedIds}
            />
          )}

          {/* Placeholder text when no image and no preview */}
          {!attachedImage && !previewImage && (
            <KonvaText
              x={0}
              y={object.height / 2 - 10}
              width={object.width}
              text={object.placeholder || 'Drop image here'}
              fontSize={14}
              fontFamily="Arial"
              fill={isHovered ? '#4F46E5' : '#666'}
              fontStyle={isHovered ? 'bold' : 'normal'}
              align="center"
              listening={false}
            />
          )}
        </Group>
      );

    default:
      return null;
  }
}

// Frame Image Renderer - renders image inside frame group
function FrameImageRenderer({
  imageObject,
  frameObject,
  selectedIds = [],
}: {
  imageObject: ImageObject;
  frameObject: FrameObject;
  selectedIds?: string[];
}) {
  const [image] = useImage(imageObject.src, 'anonymous');

  if (!image) {
    return null;
  }

  // Frame children are not selectable on canvas - only via layers panel
  // Check if frame is selected to determine if we should clip the image
  const isFrameSelected = selectedIds.includes(frameObject.id);
  const isImageSelected = selectedIds.includes(imageObject.id);

  // Only clip when frame is selected OR when image is not selected
  // When image is selected but frame is not, show full image (including out-of-bounds areas)
  const shouldClip = isFrameSelected || !isImageSelected;

  return (
    <Group
      clipFunc={shouldClip ? (ctx) => {
        // Clip to frame bounds
        ctx.rect(0, 0, frameObject.width, frameObject.height);
      } : undefined}
    >
      {/* Main image */}
      <KonvaImage
        id={imageObject.id}
        x={imageObject.x}
        y={imageObject.y}
        image={image}
        width={imageObject.width}
        height={imageObject.height}
        rotation={imageObject.rotation || 0}
        scaleX={imageObject.scaleX || 1}
        scaleY={imageObject.scaleY || 1}
        opacity={imageObject.opacity !== undefined ? imageObject.opacity : 1}
        listening={false}
      />
    </Group>
  );
}

// Frame Image Preview Renderer - renders preview of image inside frame while dragging (semi-transparent)
function FrameImagePreviewRenderer({
  imageObject,
  frameObject,
}: {
  imageObject: ImageObject;
  frameObject: FrameObject;
}) {
  const [image] = useImage(imageObject.src, 'anonymous');

  if (!image) {
    return null;
  }

  // Calculate preview dimensions (always use fit mode: maintain aspect ratio, fit inside frame)
  const imgAspect = imageObject.width / imageObject.height;
  const frameAspect = frameObject.width / frameObject.height;

  let previewWidth = frameObject.width;
  let previewHeight = frameObject.height;
  let previewX = 0;
  let previewY = 0;

  // Maintain aspect ratio, fit inside frame
  if (imgAspect > frameAspect) {
    // Image is wider
    previewWidth = frameObject.width;
    previewHeight = frameObject.width / imgAspect;
    previewY = (frameObject.height - previewHeight) / 2;
  } else {
    // Image is taller
    previewHeight = frameObject.height;
    previewWidth = frameObject.height * imgAspect;
    previewX = (frameObject.width - previewWidth) / 2;
  }

  return (
    <KonvaImage
      x={previewX}
      y={previewY}
      image={image}
      width={previewWidth}
      height={previewHeight}
      opacity={0.5} // Semi-transparent preview
      listening={false}
    />
  );
}

// Image Renderer with loading
function ImageRenderer({
  object,
  allObjects,
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
  draggedImageId,
  setDraggedImageId,
  setHoveredFrameId,
  hoveredFrameId,
  setPreviewImageId,
  onAttachImageToFrame,
}: CanvasObjectRendererProps & {
  draggedImageId?: string | null;
  setDraggedImageId?: (id: string | null) => void;
  setHoveredFrameId?: (id: string | null) => void;
  hoveredFrameId?: string | null;
  setPreviewImageId?: (id: string | null) => void;
  onAttachImageToFrame?: (imageId: string, frameId: string) => void;
}) {
  const imageObj = object as ImageObject;
  const [image] = useImage(imageObj.src, 'anonymous');

  const handleDragStart = () => {
    if (setDraggedImageId) {
      setDraggedImageId(object.id);
    }
  };

  // Helper function to check frame overlap (needs access to allObjects from parent scope)
  const checkFrameOverlapForImage = (imageNode: any) => {
    if (!setHoveredFrameId || !setPreviewImageId || draggedImageId !== object.id) return;
    
    // Use canvas coordinates (not screen coordinates)
    const imageX = imageNode.x();
    const imageY = imageNode.y();
    const imageWidth = imageNode.width() * (imageNode.scaleX() || 1);
    const imageHeight = imageNode.height() * (imageNode.scaleY() || 1);

    let foundFrame: string | null = null;
    for (const obj of allObjects) {
      if (obj.type === 'frame') {
        const frameX = obj.x;
        const frameY = obj.y;
        const frameWidth = obj.width;
        const frameHeight = obj.height;

        // AABB collision detection using canvas coordinates
        const overlap =
          imageX < frameX + frameWidth &&
          imageX + imageWidth > frameX &&
          imageY < frameY + frameHeight &&
          imageY + imageHeight > frameY;

        if (overlap) {
          foundFrame = obj.id;
          // Set preview image ID when hovering over frame
          if (draggedImageId) {
            setPreviewImageId(draggedImageId);
          }
          break;
        }
      }
    }

    setHoveredFrameId(foundFrame);
    // Clear preview if not hovering over any frame
    if (!foundFrame) {
      setPreviewImageId(null);
    }
  };

  const handleDragMove = (e: any) => {
    // Skip snapping if object is being transformed (rotated/resized)
    if (isTransforming) {
      // Still check for frame overlap even when transforming
      checkFrameOverlapForImage(e.target);
      return;
    }

    const node = e.target;

    // Handle snapping if enabled
    if (gridEnabled || snapEnabled) {
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
    }

    // Always check for frame overlap when dragging an image (regardless of grid/snap settings)
    checkFrameOverlapForImage(node);
  };

  const handleDragEnd = (e: any) => {
    if (onSnapGuidesChange) {
      onSnapGuidesChange([]);
    }

    // Check if image was dropped on a frame
    if (draggedImageId === object.id && hoveredFrameId && onAttachImageToFrame) {
      // Attach image to frame
      onAttachImageToFrame(object.id, hoveredFrameId);
    } else {
      // Normal drag end - update position
      onUpdate({
        x: e.target.x(),
        y: e.target.y(),
      });
    }

    // Reset drag state
    if (setDraggedImageId) {
      setDraggedImageId(null);
    }
    if (setHoveredFrameId) {
      setHoveredFrameId(null);
    }
    if (setPreviewImageId) {
      setPreviewImageId(null);
    }
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
      onDragStart={handleDragStart}
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
