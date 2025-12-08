import { useEffect, useRef } from 'react';
import { Transformer } from 'react-konva';
import type { CanvasObject } from '@types';

interface CanvasTransformerProps {
  selectedIds: string[];
  objects: CanvasObject[];
  onUpdate: (id: string, updates: Partial<CanvasObject>) => void;
  onTransformStart?: () => void;
  onTransformEnd?: () => void;
  onRotate?: (angle: number, x: number, y: number, isSnapped: boolean) => void;
}

export function CanvasTransformer({ selectedIds, objects, onUpdate, onTransformStart, onTransformEnd, onRotate }: CanvasTransformerProps) {
  const transformerRef = useRef<any>(null);

  // Helper function to find an object by ID, including children in groups and frames
  const findObjectById = (id: string, objectsList: CanvasObject[]): CanvasObject | null => {
    for (const obj of objectsList) {
      if (obj.id === id) {
        return obj;
      }
      if ((obj.type === 'group' || obj.type === 'frame') && 'children' in obj && obj.children) {
        const found = findObjectById(id, obj.children);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper function to find parent frame of an object
  const findParentFrame = (id: string, objectsList: CanvasObject[]): { frame: CanvasObject; child: CanvasObject } | null => {
    for (const obj of objectsList) {
      if (obj.type === 'frame' && 'children' in obj && obj.children) {
        const child = obj.children.find(child => child.id === id);
        if (child) {
          return { frame: obj, child };
        }
      }
      if (obj.type === 'group' && 'children' in obj && obj.children) {
        const found = findParentFrame(id, obj.children);
        if (found) return found;
      }
    }
    return null;
  };

  useEffect(() => {
    if (!transformerRef.current) return;

    const transformer = transformerRef.current;
    const stage = transformer.getStage();

    if (!stage) return;

    // Check if any selected ID is a frame child - if so, prioritize frame children over frames
    const frameChildIds = new Set<string>();
    const frameIds = new Set<string>();
    
    selectedIds.forEach(id => {
      const parentFrameInfo = findParentFrame(id, objects);
      if (parentFrameInfo) {
        frameChildIds.add(id);
        frameIds.add(parentFrameInfo.frame.id);
      }
    });

    // If we have frame children selected, exclude parent frames from transformer (prioritize children)
    const idsToAttach = frameChildIds.size > 0 
      ? selectedIds.filter(id => !frameIds.has(id) || frameChildIds.has(id))
      : selectedIds;

    const selectedNodes = idsToAttach
      .map((id) => stage.findOne(`#${id}`))
      .filter(Boolean);

    transformer.nodes(selectedNodes);
    
    // Force transformer layer to redraw to reflect any size changes
    // This is especially important for text objects where Group bounds might have changed
    transformer.getLayer()?.batchDraw();

    // Check if any selected object is a group, line, or text (including nested objects)
    const hasGroupSelected = idsToAttach.some(id => {
      const obj = findObjectById(id, objects);
      return obj?.type === 'group';
    });

    const hasLineSelected = idsToAttach.some(id => {
      const obj = findObjectById(id, objects);
      return obj?.type === 'line';
    });

    const hasTextSelected = idsToAttach.some(id => {
      const obj = findObjectById(id, objects);
      return obj?.type === 'text';
    });

    // Disable resizing for groups (but allow rotation)
    if (hasGroupSelected) {
      transformer.enabledAnchors(['middle-left', 'middle-right', 'top-center', 'bottom-center']);
      transformer.resizeEnabled(false);
    } else if (hasLineSelected) {
      // For lines, only allow horizontal resizing (left and right anchors only)
      transformer.enabledAnchors(['middle-left', 'middle-right']);
      transformer.resizeEnabled(true);
    } else if (hasTextSelected) {
      // For text, only allow horizontal resizing (left and right anchors only)
      // This allows changing width for text wrapping without scaling the text
      transformer.enabledAnchors(['middle-left', 'middle-right']);
      transformer.resizeEnabled(true);
    } else {
      transformer.enabledAnchors(['top-left', 'top-center', 'top-right', 'middle-right', 'middle-left', 'bottom-left', 'bottom-center', 'bottom-right']);
      transformer.resizeEnabled(true);
    }

    transformer.getLayer()?.batchDraw();
  }, [selectedIds, objects]);

  const handleTransform = (e?: any) => {
    // Check if shift key is pressed for aspect ratio lock
    const isShiftPressed = e?.evt?.shiftKey || false;
    
    // During transform, ensure lines maintain scaleY = 1, apply shift+resize aspect ratio lock, and report rotation
    if (transformerRef.current) {
      const transformer = transformerRef.current;
      const nodes = transformer.nodes();
      nodes.forEach((node: any) => {
        const id = node.id();
        if (id) {
          const obj = findObjectById(id, objects);
          
          if (obj?.type === 'line') {
            // Force scaleY to 1 during transform to prevent vertical resizing
            node.scaleY(1);
          }
          
          if (obj?.type === 'text') {
            // For text, only allow horizontal resizing (width changes for wrapping)
            // Prevent vertical scaling - text height is auto-calculated by Konva based on content and width
            node.scaleY(1);
          }
          
          // Apply shift+resize aspect ratio lock for all images (and any object with width/height)
          // Note: lines and text don't have height-based aspect ratios, so exclude them
          if (isShiftPressed && obj && 'width' in obj && 'height' in obj && obj.type !== 'text') {
            const originalAspect = obj.width / obj.height;
            const currentWidth = node.width() * (node.scaleX() || 1);
            const currentHeight = node.height() * (node.scaleY() || 1);
            const currentAspect = currentWidth / currentHeight;
            
            // If aspect ratio changed, adjust to maintain it
            if (Math.abs(currentAspect - originalAspect) > 0.01) {
              // Determine which dimension to constrain based on which changed more
              const scaleXChange = Math.abs((node.scaleX() || 1) - 1);
              const scaleYChange = Math.abs((node.scaleY() || 1) - 1);
              
              if (scaleXChange > scaleYChange) {
                // Width changed more - adjust height
                const newHeight = currentWidth / originalAspect;
                const newScaleY = newHeight / (obj.height || 1);
                node.scaleY(newScaleY);
              } else {
                // Height changed more - adjust width
                const newWidth = currentHeight * originalAspect;
                const newScaleX = newWidth / (obj.width || 1);
                node.scaleX(newScaleX);
              }
            }
          }

          // Report rotation if callback exists
          if (onRotate) {
            const rotation = node.rotation();
            const rotationSnap = 45;
            const snappedRotation = Math.round(rotation / rotationSnap) * rotationSnap;
            const isSnapped = Math.abs(rotation - snappedRotation) < 5;

            onRotate(rotation, node.x(), node.y(), isSnapped);
          }
        }
      });
    }
    // Notify that transformation is in progress
    if (onTransformStart) {
      onTransformStart();
    }
  };

  const handleTransformEndInternal = (e?: any) => {
    const transformer = transformerRef.current;
    if (!transformer) {
      return;
    }

    // Check if shift key was pressed for aspect ratio lock
    const isShiftPressed = e?.evt?.shiftKey || false;

    // Get all nodes attached to the transformer
    const nodes = transformer.nodes();

    // Update each transformed node
    nodes.forEach((node: any) => {
      const id = node.id();

      if (!id) return;

      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      // Get the current object (including nested children in groups and frames)
      const currentObject = findObjectById(id, objects);

      // Snap rotation to 45-degree increments
      let rotation = node.rotation();
      const rotationSnap = 45;
      const snappedRotation = Math.round(rotation / rotationSnap) * rotationSnap;

      // Only snap if close to a 45-degree mark (within 5 degrees)
      if (Math.abs(rotation - snappedRotation) < 5) {
        rotation = snappedRotation;
        node.rotation(rotation); // Update node rotation for visual feedback
      }

      const updates: any = {
        x: node.x(),
        y: node.y(),
        rotation: rotation,
      };

      // For text objects, only update width for text wrapping (no scaling, no height changes)
      // Handle this BEFORE shift+aspect ratio lock so text is excluded from that logic
      if (currentObject && currentObject.type === 'text') {
        // Only apply horizontal scaling to width property (for text wrapping)
        // Text height is automatically calculated by Konva based on content and width
        const textObj = currentObject as any;
        
        // Get the current rendered width from the node (this accounts for any existing scale)
        const currentRenderedWidth = node.width ? node.width() : 0;
        const currentScaleX = node.scaleX ? node.scaleX() : 1;
        
        // Calculate the actual base width (divide out any existing scale)
        // If object has a stored width, use that; otherwise use the node's natural width
        let baseWidth: number;
        if (textObj.width && textObj.width > 0) {
          // Use stored width as base
          baseWidth = textObj.width;
        } else if (currentRenderedWidth > 0) {
          // Calculate base width by removing current scale
          baseWidth = currentRenderedWidth / currentScaleX;
        } else {
          // Fallback: estimate from text content and font size
          const fontSize = textObj.fontSize || 16;
          const text = textObj.text || '';
          baseWidth = Math.max(100, text.length * fontSize * 0.6);
        }
        
        // Ensure baseWidth is valid
        if (!baseWidth || baseWidth <= 0 || !isFinite(baseWidth)) {
          const fontSize = textObj.fontSize || 16;
          const text = textObj.text || '';
          baseWidth = Math.max(100, text.length * fontSize * 0.6);
        }
        
        // Calculate new width based on scaleX, ensuring minimum width of 50px
        // Only update width if scaleX has meaningfully changed (more than 0.01 difference)
        if (Math.abs(scaleX - 1) > 0.01 && scaleX > 0 && isFinite(scaleX)) {
          const newWidth = Math.max(50, baseWidth * scaleX);
          // Additional safety check: ensure newWidth is reasonable
          if (newWidth > 0 && isFinite(newWidth) && newWidth < 10000) {
            updates.width = newWidth;
          } else {
            // If calculation resulted in invalid width, use fallback
            const fontSize = textObj.fontSize || 16;
            const text = textObj.text || '';
            updates.width = Math.max(100, text.length * fontSize * 0.6);
          }
        } else if (!textObj.width || textObj.width <= 0) {
          // If no width was set before and scale hasn't changed, set a default
          // But only if baseWidth is valid
          if (baseWidth > 0 && isFinite(baseWidth)) {
            updates.width = Math.max(100, baseWidth);
          } else {
            // Ultimate fallback
            const fontSize = textObj.fontSize || 16;
            const text = textObj.text || '';
            updates.width = Math.max(100, text.length * fontSize * 0.6);
          }
        }
        
        // Always reset scales to 1 - text should not be scaled
        updates.scaleX = 1;
        updates.scaleY = 1;
        // Font size and other text properties remain unchanged
      }
      // Apply shift+resize aspect ratio lock for all images (and any object with width/height)
      // Note: lines and text are already handled above, so exclude them
      else if (isShiftPressed && currentObject && 'width' in currentObject && 'height' in currentObject && currentObject.type !== 'text') {
        // Maintain aspect ratio using average scale
        const avgScale = (scaleX + scaleY) / 2;
        updates.width = Math.max(5, currentObject.width * avgScale);
        updates.height = Math.max(5, currentObject.height * avgScale);
        updates.scaleX = 1;
        updates.scaleY = 1;
      }
      // For lines, only allow width resizing (horizontal scaling)
      else if (currentObject && currentObject.type === 'line') {
        // For lines, we modify the points array to change width
        // Only apply horizontal scaling, ignore vertical scaling
        if (scaleX !== 1 && currentObject.type === 'line' && 'points' in currentObject) {
          const points = [...(currentObject as any).points];
          // Scale only X coordinates (even indices)
          for (let i = 0; i < points.length; i += 2) {
            points[i] = points[i] * scaleX;
          }
          updates.points = points;
        }
        // Always reset scaleY to 1 for lines (prevent vertical resizing)
        updates.scaleX = 1;
        updates.scaleY = 1;
        // Also ensure node scaleY is reset immediately
        node.scaleY(1);
      }
      // For shapes with width/height, apply the scale to the base dimensions
      else if (node.width && currentObject && 'width' in currentObject && currentObject.width !== undefined) {
        updates.width = Math.max(5, currentObject.width * scaleX);
        updates.scaleX = 1;
      } else {
        updates.scaleX = scaleX;
      }

      if (currentObject && currentObject.type !== 'line' && currentObject.type !== 'text') {
        if (node.height && currentObject && 'height' in currentObject && currentObject.height !== undefined) {
          updates.height = Math.max(5, currentObject.height * scaleY);
          updates.scaleY = 1;
        } else {
          updates.scaleY = scaleY;
        }
      }

      // For circles, preserve scaleX and scaleY to allow elliptical shapes
      if (currentObject && 'radius' in currentObject && currentObject.radius !== undefined) {
        // Keep the scale values instead of resetting them
        // This allows circles to become ellipses (oblongs)
        updates.scaleX = scaleX;
        updates.scaleY = scaleY;
      }

      // For text objects, ensure width is valid before applying updates
      if (currentObject && currentObject.type === 'text' && updates.width !== undefined) {
        // Double-check that width is valid
        if (updates.width <= 0 || !isFinite(updates.width) || updates.width > 10000) {
          // Don't apply invalid width - use fallback instead
          const textObj = currentObject as any;
          const fontSize = textObj.fontSize || 16;
          const text = textObj.text || '';
          const fallbackWidth = Math.max(100, text.length * fontSize * 0.6);
          updates.width = fallbackWidth;
        }
        
      }

      onUpdate(id, updates);

      // Reset node scale after update (but not for circles which use scale)
      if (currentObject && currentObject.type !== 'circle') {
        node.scaleX(1);
        node.scaleY(1);
      }
      
      // For text objects, update the invisible Rect inside the Group to match new width
      // This ensures the transformer box reflects the correct dimensions
      if (currentObject && currentObject.type === 'text' && updates.width !== undefined && node && node.getType && node.getType() === 'Group') {
        // Find the invisible bounds Rect child in the Group (by name, or first Rect as fallback)
        const rect = node.findOne('.text-bounds-rect') || node.findOne('Rect');
        if (rect && updates.width > 0) {
          const textObj = currentObject as any;
          const fontSize = textObj.fontSize || 16;
          const text = textObj.text || '';
          
          // Update Rect width to match text width
          rect.width(updates.width);
          
          // Estimate and update height based on wrapped text
          const avgCharWidth = fontSize * 0.6;
          const charsPerLine = Math.floor(updates.width / avgCharWidth);
          const lineCount = charsPerLine > 0 ? Math.ceil(text.length / charsPerLine) : 1;
          const estimatedHeight = fontSize * 1.2 * lineCount;
          
          rect.height(estimatedHeight);
          
          // Force transformer to recalculate its bounds
          const transformer = transformerRef.current;
          if (transformer) {
            // Re-attach nodes to force recalculation
            transformer.nodes(transformer.nodes());
            transformer.getLayer()?.batchDraw();
          }
        }
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
        // Check if any selected object is a line (including nested in groups)
        const hasLineSelected = selectedIds.some(id => {
          const obj = findObjectById(id, objects);
          return obj?.type === 'line';
        });

        // For lines, prevent height changes
        if (hasLineSelected) {
          return {
            ...newBox,
            height: oldBox.height, // Keep original height
          };
        }

        // Limit minimum size
        if (newBox.width < 5 || newBox.height < 5) {
          return oldBox;
        }
        return newBox;
      }}
    />
  );
}
