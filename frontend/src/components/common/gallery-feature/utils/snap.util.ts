import type { CanvasObject } from '@types';

export const GRID_SIZE = 10;
export const SNAP_THRESHOLD = 15; // For object-to-object snapping
export const GRID_SNAP_THRESHOLD = 25; // Stronger threshold for grid and canvas-center snapping
export const SNAP_STRENGTH = 20; // Distance needed to break free from snap

interface SnapResult {
  x: number;
  y: number;
  guides: SnapGuide[];
}

export interface SnapGuide {
  type: 'vertical' | 'horizontal';
  position: number;
  snapType?: 'grid' | 'object' | 'canvas-center'; // Type of snap for visual feedback
}

export function snapToGrid(value: number, gridSize: number = GRID_SIZE): number {
  return Math.round(value / gridSize) * gridSize;
}

// Helper function to find parent frame of an object
function findParentFrame(id: string, objectsList: CanvasObject[]): { frame: CanvasObject; child: CanvasObject } | null {
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
}

export function snapPosition(
  x: number,
  y: number,
  gridEnabled: boolean,
  snapEnabled: boolean,
  objects: CanvasObject[],
  currentObjectId: string,
  width: number,
  height: number,
  objectWidth?: number,
  objectHeight?: number,
  rotation?: number
): SnapResult {
  let snappedX = x;
  let snappedY = y;
  const guides: SnapGuide[] = [];

  // Get current object for center calculations
  const currentObject = objects.find(obj => obj.id === currentObjectId);
  const currWidth = objectWidth || getObjectWidth(currentObject!) || 0;
  const currHeight = objectHeight || getObjectHeight(currentObject!) || 0;
  const currRotation = rotation !== undefined ? rotation : (currentObject?.rotation || 0);
  
  // Check if this is a frame child
  const parentFrameInfo = findParentFrame(currentObjectId, objects);
  const isFrameChild = parentFrameInfo !== null;

  // Ensure we have valid dimensions (never 0)
  // This is especially important for text objects where dimensions might not be immediately available
  const safeWidth = Math.max(1, currWidth);
  const safeHeight = Math.max(1, currHeight);

  // Debug logging for groups
  if (currentObject?.type === 'group') {
    const bounds = getGroupVisualBounds(currentObject);
    console.log('[snapUtils] Group snap calculation:', {
      id: currentObjectId,
      x,
      y,
      calculatedWidth: currWidth,
      calculatedHeight: currHeight,
      storedWidth: currentObject.width,
      storedHeight: currentObject.height,
      children: currentObject.children?.length,
      visibleChildren: currentObject.children?.filter(c => c.visible !== false).length,
      visualBounds: bounds,
      calculatedCenter: { x: x + currWidth / 2, y: y + currHeight / 2 },
      actualVisualCenter: bounds ? { x: x + (bounds.minX + bounds.maxX) / 2, y: y + (bounds.minY + bounds.maxY) / 2 } : null,
    });
  }

  // For circles, position is already at center in Konva
  const isCircle = currentObject?.type === 'circle';
  const isGroup = currentObject?.type === 'group';
  const isText = currentObject?.type === 'text';

  // Calculate visual center considering rotation and group child positions
  // For non-rotated objects or circles, use simple calculation
  let currCenterX: number;
  let currCenterY: number;

  if (isCircle || Math.abs(currRotation % 360) < 0.01) {
    // For groups, use actual visual bounds to calculate center
    if (isGroup) {
      const bounds = getGroupVisualBounds(currentObject!);
      if (bounds) {
        // The actual visual center based on where children are positioned
        currCenterX = x + (bounds.minX + bounds.maxX) / 2;
        currCenterY = y + (bounds.minY + bounds.maxY) / 2;
      } else {
        // Fallback if no visible children
        currCenterX = x + safeWidth / 2;
        currCenterY = y + safeHeight / 2;
      }
    } else {
      // Circle or no rotation: simple center calculation
      // For text objects, use safe dimensions to ensure valid center calculation
      currCenterX = isCircle ? x : x + safeWidth / 2;
      currCenterY = isCircle ? y : y + safeHeight / 2;
    }
  } else {
    // For rotated objects, calculate actual visual center
    // Konva rotates around the top-left corner (x, y), so we need to find where the center ends up
    const angleRad = (currRotation * Math.PI) / 180;
    const halfWidth = safeWidth / 2;
    const halfHeight = safeHeight / 2;

    // Center offset from rotation point (top-left)
    const centerOffsetX = halfWidth * Math.cos(angleRad) - halfHeight * Math.sin(angleRad);
    const centerOffsetY = halfWidth * Math.sin(angleRad) + halfHeight * Math.cos(angleRad);

    currCenterX = x + centerOffsetX;
    currCenterY = y + centerOffsetY;
  }

  // Helper function to convert center position back to top-left position
  const centerToTopLeft = (centerX: number, centerY: number): { x: number; y: number } => {
    if (isCircle) {
      return { x: centerX, y: centerY };
    }

    if (Math.abs(currRotation % 360) < 0.01) {
      // For groups, reverse the actual visual center calculation
      if (isGroup) {
        const bounds = getGroupVisualBounds(currentObject!);
        if (bounds) {
          // Calculate what x should be based on desired center
          const visualCenterOffsetX = (bounds.minX + bounds.maxX) / 2;
          const visualCenterOffsetY = (bounds.minY + bounds.maxY) / 2;
          return {
            x: centerX - visualCenterOffsetX,
            y: centerY - visualCenterOffsetY,
          };
        }
      }
      // No rotation: simple offset (use safe dimensions)
      return { x: centerX - safeWidth / 2, y: centerY - safeHeight / 2 };
    }

    // For rotated objects, calculate top-left from desired center (use safe dimensions)
    const angleRad = (currRotation * Math.PI) / 180;
    const halfWidth = safeWidth / 2;
    const halfHeight = safeHeight / 2;

    // Reverse the center offset calculation
    const centerOffsetX = halfWidth * Math.cos(angleRad) - halfHeight * Math.sin(angleRad);
    const centerOffsetY = halfWidth * Math.sin(angleRad) + halfHeight * Math.cos(angleRad);

    return {
      x: centerX - centerOffsetX,
      y: centerY - centerOffsetY,
    };
  };

  // Canvas center snapping - snap center, left edge, right edge, top edge, or bottom edge to center lines
  if (snapEnabled) {
    const canvasCenterX = width / 2;
    const canvasCenterY = height / 2;

    let snappedCenterX = currCenterX;
    let snappedCenterY = currCenterY;

    // Calculate object edges
    const currLeft = isCircle ? x - safeWidth / 2 : x;
    const currRight = isCircle ? x + safeWidth / 2 : x + safeWidth;
    const currTop = isCircle ? y - safeHeight / 2 : y;
    const currBottom = isCircle ? y + safeHeight / 2 : y + safeHeight;

    // Snap to canvas center vertical line (check center, left edge, right edge)
    const xCandidates = [
      { pos: currCenterX, type: 'center' },
      { pos: currLeft, type: 'left' },
      { pos: currRight, type: 'right' },
    ];

    let closestXDist = Infinity;
    let bestXCandidate = null;

    for (const candidate of xCandidates) {
      const dist = Math.abs(candidate.pos - canvasCenterX);
      if (dist < GRID_SNAP_THRESHOLD && dist < closestXDist) {
        closestXDist = dist;
        bestXCandidate = candidate;
      }
    }

    if (bestXCandidate) {
      // Calculate where the center should be based on which part is snapping
      if (bestXCandidate.type === 'center') {
        snappedCenterX = canvasCenterX;
      } else if (bestXCandidate.type === 'left') {
        snappedCenterX = canvasCenterX + safeWidth / 2;
      } else if (bestXCandidate.type === 'right') {
        snappedCenterX = canvasCenterX - safeWidth / 2;
      }
      guides.push({ type: 'vertical', position: canvasCenterX, snapType: 'canvas-center' });
    }

    // Snap to canvas center horizontal line (check center, top edge, bottom edge)
    const yCandidates = [
      { pos: currCenterY, type: 'center' },
      { pos: currTop, type: 'top' },
      { pos: currBottom, type: 'bottom' },
    ];

    let closestYDist = Infinity;
    let bestYCandidate = null;

    for (const candidate of yCandidates) {
      const dist = Math.abs(candidate.pos - canvasCenterY);
      if (dist < GRID_SNAP_THRESHOLD && dist < closestYDist) {
        closestYDist = dist;
        bestYCandidate = candidate;
      }
    }

    if (bestYCandidate) {
      // Calculate where the center should be based on which part is snapping
      if (bestYCandidate.type === 'center') {
        snappedCenterY = canvasCenterY;
      } else if (bestYCandidate.type === 'top') {
        snappedCenterY = canvasCenterY + safeHeight / 2;
      } else if (bestYCandidate.type === 'bottom') {
        snappedCenterY = canvasCenterY - safeHeight / 2;
      }
      guides.push({ type: 'horizontal', position: canvasCenterY, snapType: 'canvas-center' });
    }

    // Apply both snaps together if any occurred
    if (snappedCenterX !== currCenterX || snappedCenterY !== currCenterY) {
      const newPos = centerToTopLeft(snappedCenterX, snappedCenterY);
      snappedX = newPos.x;
      snappedY = newPos.y;
    }
  }

  // Grid snapping with visual guides (snap only center to grid)
  // Note: Grid snapping requires both grid and snap to be enabled
  if (gridEnabled && snapEnabled) {
    // Initialize snap variables
    let gridSnappedCenterX = currCenterX;
    let gridSnappedCenterY = currCenterY;

    // Try snapping object's center to grid (only if center is valid) - use stronger threshold
    if (!isNaN(currCenterX) && !isNaN(currCenterY) && isFinite(currCenterX) && isFinite(currCenterY)) {
      const gridCenterX = snapToGrid(currCenterX);
      const gridCenterY = snapToGrid(currCenterY);

      if (Math.abs(currCenterX - gridCenterX) < GRID_SNAP_THRESHOLD && !guides.some(g => g.type === 'vertical')) {
        gridSnappedCenterX = gridCenterX;
        guides.push({ type: 'vertical', position: gridCenterX, snapType: 'grid' });
      }

      if (Math.abs(currCenterY - gridCenterY) < GRID_SNAP_THRESHOLD && !guides.some(g => g.type === 'horizontal')) {
        gridSnappedCenterY = gridCenterY;
        guides.push({ type: 'horizontal', position: gridCenterY, snapType: 'grid' });
      }

      // Apply both grid snaps together if any occurred
      if (gridSnappedCenterX !== currCenterX || gridSnappedCenterY !== currCenterY) {
        const newPos = centerToTopLeft(gridSnappedCenterX, gridSnappedCenterY);
        snappedX = newPos.x;
        snappedY = newPos.y;
      }
    }

    // Debug logging for text objects
    if (currentObject?.type === 'text') {
      console.log('[snapUtils] Text grid snapping:', {
        original: { x, y },
        snapped: { x: snappedX, y: snappedY },
        guides: guides.length,
        guideDetails: guides,
        currCenterX,
        currCenterY,
        safeWidth,
        safeHeight,
        gridEnabled,
        snapEnabled,
        centerValid: !isNaN(currCenterX) && !isNaN(currCenterY) && isFinite(currCenterX) && isFinite(currCenterY),
      });
    }
  }

  // Frame edge snapping (for frame children) - after center calculation
  if (snapEnabled && isFrameChild && parentFrameInfo && 'width' in parentFrameInfo.frame && 'height' in parentFrameInfo.frame) {
    const frameWidth = parentFrameInfo.frame.width;
    const frameHeight = parentFrameInfo.frame.height;
    
    // Frame edges in relative coordinates: left=0, right=frameWidth, top=0, bottom=frameHeight
    const frameLeft = 0;
    const frameRight = frameWidth;
    const frameTop = 0;
    const frameBottom = frameHeight;
    const frameCenterX = frameWidth / 2;
    const frameCenterY = frameHeight / 2;
    
    // Calculate current object edges (in relative coordinates)
    const currRight = isCircle ? x + safeWidth / 2 : x + safeWidth;
    const currBottom = isCircle ? y + safeHeight / 2 : y + safeHeight;
    const currLeft = isCircle ? x - safeWidth / 2 : x;
    const currTop = isCircle ? y - safeHeight / 2 : y;
    
    // Snap to frame edges
    let frameSnappedX = snappedX;
    let frameSnappedY = snappedY;
    let frameSnapX = false;
    let frameSnapY = false;
    
    // Horizontal snapping to frame edges
    const xFrameDistances = [
      { pos: frameLeft, dist: Math.abs(currLeft - frameLeft), guidePos: frameLeft },
      { pos: frameRight - safeWidth, dist: Math.abs(currRight - frameRight), guidePos: frameRight },
      { pos: frameCenterX - safeWidth / 2, dist: Math.abs(currCenterX - frameCenterX), guidePos: frameCenterX },
    ];
    
    let minFrameXDist = SNAP_THRESHOLD;
    let bestFrameX: { pos: number; guidePos: number } | null = null;
    
    for (const { pos, dist, guidePos } of xFrameDistances) {
      if (dist < minFrameXDist) {
        minFrameXDist = dist;
        bestFrameX = { pos, guidePos };
      }
    }
    
    if (bestFrameX) {
      frameSnappedX = bestFrameX.pos;
      frameSnapX = true;
      guides.push({ type: 'vertical', position: bestFrameX.guidePos, snapType: 'object' });
    }
    
    // Vertical snapping to frame edges
    const yFrameDistances = [
      { pos: frameTop, dist: Math.abs(currTop - frameTop), guidePos: frameTop },
      { pos: frameBottom - safeHeight, dist: Math.abs(currBottom - frameBottom), guidePos: frameBottom },
      { pos: frameCenterY - safeHeight / 2, dist: Math.abs(currCenterY - frameCenterY), guidePos: frameCenterY },
    ];
    
    let minFrameYDist = SNAP_THRESHOLD;
    let bestFrameY: { pos: number; guidePos: number } | null = null;
    
    for (const { pos, dist, guidePos } of yFrameDistances) {
      if (dist < minFrameYDist) {
        minFrameYDist = dist;
        bestFrameY = { pos, guidePos };
      }
    }
    
    if (bestFrameY) {
      frameSnappedY = bestFrameY.pos;
      frameSnapY = true;
      guides.push({ type: 'horizontal', position: bestFrameY.guidePos, snapType: 'object' });
    }
    
    // Apply frame snaps
    if (frameSnapX || frameSnapY) {
      snappedX = frameSnappedX;
      snappedY = frameSnappedY;
    }
  }

  // Object-to-object snapping (edges and centers)
  if (snapEnabled) {
    const otherObjects = objects.filter((obj) => obj.id !== currentObjectId);
    console.log('[snapUtils] Object snapping check:', {
      snapEnabled,
      otherObjectsCount: otherObjects.length,
      currentObjectId,
      totalObjects: objects.length,
    });

    let closestX: number | null = null;
    let closestY: number | null = null;
    let guideLineX: number | null = null; // Track the actual guide line position
    let guideLineY: number | null = null; // Track the actual guide line position
    let minXDist = SNAP_THRESHOLD;
    let minYDist = SNAP_THRESHOLD;

    for (const obj of otherObjects) {
      const objWidth = getObjectWidth(obj) || 0;
      const objHeight = getObjectHeight(obj) || 0;
      const isObjCircle = obj.type === 'circle';

      // For circles, position is at center; for others, at top-left
      const objCenterX = isObjCircle ? obj.x : obj.x + objWidth / 2;
      const objCenterY = isObjCircle ? obj.y : obj.y + objHeight / 2;
      const objRight = isObjCircle ? obj.x + objWidth / 2 : obj.x + objWidth;
      const objBottom = isObjCircle ? obj.y + objHeight / 2 : obj.y + objHeight;
      const objLeft = isObjCircle ? obj.x - objWidth / 2 : obj.x;
      const objTop = isObjCircle ? obj.y - objHeight / 2 : obj.y;

      const currRight = isCircle ? x + safeWidth / 2 : x + safeWidth;
      const currBottom = isCircle ? y + safeHeight / 2 : y + safeHeight;
      const currLeft = isCircle ? x - safeWidth / 2 : x;
      const currTop = isCircle ? y - safeHeight / 2 : y;

      // Check horizontal alignment (left edge, center, right edge)
      // For circles: pos is the X coordinate (center), for rects: pos is the top-left X
      const xDistances = [
        // Left edges align - for circles, add radius to get center position
        { pos: isCircle ? objLeft + safeWidth / 2 : objLeft, dist: Math.abs(currLeft - objLeft), guidePosX: objLeft },
        // Right edges align
        { pos: isCircle ? objRight - safeWidth / 2 : objRight - safeWidth, dist: Math.abs(currRight - objRight), guidePosX: objRight },
        // Centers align
        { pos: isCircle ? objCenterX : objCenterX - safeWidth / 2, dist: Math.abs(currCenterX - objCenterX), guidePosX: objCenterX },
        // Current left to obj right (spacing alignment) - for circles, add radius
        { pos: isCircle ? objRight + safeWidth / 2 : objRight, dist: Math.abs(currLeft - objRight), guidePosX: objRight },
        // Current right to obj left (spacing alignment)
        { pos: isCircle ? objLeft - safeWidth / 2 : objLeft - safeWidth, dist: Math.abs(currRight - objLeft), guidePosX: objLeft },
      ];

      for (const { pos, dist, guidePosX } of xDistances) {
        // Add small deadband to prevent micro-oscillations (especially for circles)
        // If we're already within 2px of this position, don't re-snap
        const currentDistFromPos = Math.abs((isCircle ? x : x + safeWidth / 2) - (isCircle ? pos : pos + safeWidth / 2));
        if (dist < minXDist && currentDistFromPos > 2) {
          minXDist = dist;
          closestX = pos;
          guideLineX = guidePosX; // Store the guide line position
        }
      }

      // Check vertical alignment (top edge, center, bottom edge)
      const yDistances = [
        // Top edges align - for circles, add radius to get center position
        { pos: isCircle ? objTop + safeHeight / 2 : objTop, dist: Math.abs(currTop - objTop), guidePosY: objTop },
        // Bottom edges align
        { pos: isCircle ? objBottom - safeHeight / 2 : objBottom - safeHeight, dist: Math.abs(currBottom - objBottom), guidePosY: objBottom },
        // Centers align
        { pos: isCircle ? objCenterY : objCenterY - safeHeight / 2, dist: Math.abs(currCenterY - objCenterY), guidePosY: objCenterY },
        // Current top to obj bottom (spacing alignment) - for circles, add radius
        { pos: isCircle ? objBottom + safeHeight / 2 : objBottom, dist: Math.abs(currTop - objBottom), guidePosY: objBottom },
        // Current bottom to obj top (spacing alignment)
        { pos: isCircle ? objTop - safeHeight / 2 : objTop - safeHeight, dist: Math.abs(currBottom - objTop), guidePosY: objTop },
      ];

      for (const { pos, dist, guidePosY } of yDistances) {
        // Add small deadband to prevent micro-oscillations (especially for circles)
        const currentDistFromPos = Math.abs((isCircle ? y : y + safeHeight / 2) - (isCircle ? pos : pos + safeHeight / 2));
        if (dist < minYDist && currentDistFromPos > 2) {
          minYDist = dist;
          closestY = pos;
          guideLineY = guidePosY; // Store the guide line position
        }
      }
    }

    // Apply object snapping only if not already snapping to canvas center or grid
    let objSnappedCenterX = currCenterX;
    let objSnappedCenterY = currCenterY;
    let hasObjSnapX = false;
    let hasObjSnapY = false;

    console.log('[snapUtils] Object snap results:', {
      closestX,
      closestY,
      guideLineX,
      guideLineY,
      minXDist,
      minYDist,
      threshold: SNAP_THRESHOLD,
      hasExistingVerticalGuide: guides.some(g => g.type === 'vertical'),
      hasExistingHorizontalGuide: guides.some(g => g.type === 'horizontal'),
    });

    // Allow multiple guides of the same type (vertical/horizontal) as long as they're at different positions
    // This enables grid, canvas-center, AND object snap guides to coexist
    if (closestX !== null && guideLineX !== null) {
      console.log('[snapUtils] ✅ Adding VERTICAL object snap guide at position:', guideLineX);
      // Calculate what center position this closestX represents
      if (isCircle) {
        objSnappedCenterX = closestX;
      } else {
        objSnappedCenterX = closestX + safeWidth / 2;
      }
      // Use the actual alignment line position for the guide, not the object center
      guides.push({ type: 'vertical', position: guideLineX, snapType: 'object' });
      hasObjSnapX = true;
      console.log('[snapUtils] Guides array after adding vertical:', guides.map(g => ({ type: g.type, snapType: g.snapType, position: g.position })));
    }

    if (closestY !== null && guideLineY !== null) {
      console.log('[snapUtils] ✅ Adding HORIZONTAL object snap guide at position:', guideLineY);
      // Calculate what center position this closestY represents
      if (isCircle) {
        objSnappedCenterY = closestY;
      } else {
        objSnappedCenterY = closestY + safeHeight / 2;
      }
      // Use the actual alignment line position for the guide, not the object center
      guides.push({ type: 'horizontal', position: guideLineY, snapType: 'object' });
      hasObjSnapY = true;
      console.log('[snapUtils] Guides array after adding horizontal:', guides.map(g => ({ type: g.type, snapType: g.snapType, position: g.position })));
    }

    // Apply both object snaps together if any occurred
    if (hasObjSnapX || hasObjSnapY) {
      const newPos = centerToTopLeft(objSnappedCenterX, objSnappedCenterY);
      snappedX = newPos.x;
      snappedY = newPos.y;
    }
  }

  console.log('[snapUtils] FINAL guides being returned:', guides.map(g => ({ type: g.type, snapType: g.snapType, position: g.position })));
  return { x: snappedX, y: snappedY, guides };
}

// Helper to calculate actual visual bounds for groups
function getGroupVisualBounds(obj: CanvasObject): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (obj.type !== 'group' || !('children' in obj) || !obj.children || obj.children.length === 0) {
    return null;
  }

  const visibleChildren = obj.children.filter(child => child.visible !== false);
  if (visibleChildren.length === 0) {
    return null;
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  visibleChildren.forEach(child => {
    let childMinX = child.x;
    let childMinY = child.y;
    let childMaxX = child.x;
    let childMaxY = child.y;

    // Handle line objects - calculate bounds from points array
    if (child.type === 'line') {
      const lineChild = child as any;
      if (lineChild.points && Array.isArray(lineChild.points) && lineChild.points.length >= 2) {
        // Points array is [x1, y1, x2, y2, x3, y3, ...] relative to line position
        let lineMinX = Infinity;
        let lineMinY = Infinity;
        let lineMaxX = -Infinity;
        let lineMaxY = -Infinity;

        // Extract all X coordinates (even indices) and Y coordinates (odd indices)
        for (let i = 0; i < lineChild.points.length; i += 2) {
          if (i + 1 < lineChild.points.length) {
            const px = lineChild.points[i];
            const py = lineChild.points[i + 1];
            lineMinX = Math.min(lineMinX, px);
            lineMinY = Math.min(lineMinY, py);
            lineMaxX = Math.max(lineMaxX, px);
            lineMaxY = Math.max(lineMaxY, py);
          }
        }

        // Apply scale if present
        const scaleX = child.scaleX || 1;
        const scaleY = child.scaleY || 1;
        
        // Calculate bounds relative to line position
        childMinX = child.x + lineMinX * scaleX;
        childMinY = child.y + lineMinY * scaleY;
        childMaxX = child.x + lineMaxX * scaleX;
        childMaxY = child.y + lineMaxY * scaleY;
      } else {
        // Fallback: if no valid points, use position as single point
        childMinX = child.x;
        childMinY = child.y;
        childMaxX = child.x;
        childMaxY = child.y;
      }
    }
    // Handle text objects - use width if available, otherwise estimate
    else if (child.type === 'text') {
      const textChild = child as any;
      const scaleX = child.scaleX || 1;
      const scaleY = child.scaleY || 1;
      
      // Use width if explicitly set
      if (textChild.width !== undefined && textChild.width > 0) {
        childMaxX = child.x + textChild.width * scaleX;
      } else {
        // Estimate width based on text length and font size (rough approximation)
        const fontSize = textChild.fontSize || 16;
        const estimatedWidth = (textChild.text?.length || 10) * fontSize * 0.6; // Rough char width estimate
        childMaxX = child.x + estimatedWidth * scaleX;
      }
      
      // Estimate height based on font size
      const fontSize = textChild.fontSize || 16;
      const estimatedHeight = fontSize * 1.2; // Line height multiplier
      childMaxY = child.y + estimatedHeight * scaleY;
    }
    // Handle objects with width/height
    else if ('width' in child && child.width !== undefined) {
      childMaxX = child.x + child.width * (child.scaleX || 1);
    }
    // Handle objects with height
    if ('height' in child && child.height !== undefined) {
      childMaxY = child.y + child.height * (child.scaleY || 1);
    }
    // Handle circles (radius)
    if ('radius' in child && child.radius !== undefined && child.type !== 'line') {
      const radiusX = child.radius * (child.scaleX || 1);
      const radiusY = child.radius * (child.scaleY || 1);
      // For circles, we need to account for the full diameter
      childMinX = child.x - radiusX;
      childMinY = child.y - radiusY;
      childMaxX = child.x + radiusX;
      childMaxY = child.y + radiusY;
    }

    minX = Math.min(minX, childMinX);
    minY = Math.min(minY, childMinY);
    maxX = Math.max(maxX, childMaxX);
    maxY = Math.max(maxY, childMaxY);
  });

  return { minX, minY, maxX, maxY };
}

function getObjectWidth(obj: CanvasObject): number | null {
  switch (obj.type) {
    case 'rect':
    case 'image':
    case 'gallery-item':
    case 'frame':
      // For frames, always use stored dimensions (not children dimensions)
      return obj.width * (obj.scaleX || 1);
    case 'group': {
      // For groups, calculate actual bounds from visible children
      const bounds = getGroupVisualBounds(obj);
      if (bounds) {
        return (bounds.maxX - bounds.minX) * (obj.scaleX || 1);
      }
      return obj.width * (obj.scaleX || 1);
    }
    case 'circle':
      return obj.radius * 2 * (obj.scaleX || 1);
    case 'text': {
      const textObj = obj as any;
      const scaleX = obj.scaleX || 1;

      // If width is explicitly set, use it
      if (textObj.width !== undefined && textObj.width > 0) {
        return textObj.width * scaleX;
      }

      // Otherwise, estimate width based on text length and font size
      const fontSize = textObj.fontSize || 16;
      const text = textObj.text || '';
      const estimatedWidth = text.length * fontSize * 0.6; // Rough char width estimate
      return estimatedWidth * scaleX;
    }
    default:
      return null;
  }
}

function getObjectHeight(obj: CanvasObject): number | null {
  switch (obj.type) {
    case 'rect':
    case 'image':
    case 'gallery-item':
    case 'frame':
      // For frames, always use stored dimensions (not children dimensions)
      return obj.height * (obj.scaleY || 1);
    case 'group': {
      // For groups, calculate actual bounds from visible children
      const bounds = getGroupVisualBounds(obj);
      if (bounds) {
        return (bounds.maxY - bounds.minY) * (obj.scaleY || 1);
      }
      return obj.height * (obj.scaleY || 1);
    }
    case 'circle':
      return obj.radius * 2 * (obj.scaleY || 1);
    case 'text': {
      // For text objects, estimate height based on font size
      // This is an approximation since we don't have access to the actual rendered height here
      const textObj = obj as any;
      const fontSize = textObj.fontSize || 16;
      const estimatedHeight = fontSize * 1.2; // Line height multiplier
      return estimatedHeight * (obj.scaleY || 1);
    }
    default:
      return null;
  }
}

export function getBoundingBox(obj: CanvasObject): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const width = getObjectWidth(obj) || 0;
  const height = getObjectHeight(obj) || 0;

  return {
    x: obj.x,
    y: obj.y,
    width,
    height,
  };
}
