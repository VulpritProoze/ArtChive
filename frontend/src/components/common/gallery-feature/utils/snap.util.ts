import type { CanvasObject } from '@types';

export const GRID_SIZE = 10;
export const SNAP_THRESHOLD = 15; // Increased from 10 for stronger snapping
export const SNAP_STRENGTH = 20; // Distance needed to break free from snap

interface SnapResult {
  x: number;
  y: number;
  guides: SnapGuide[];
}

export interface SnapGuide {
  type: 'vertical' | 'horizontal';
  position: number;
}

export function snapToGrid(value: number, gridSize: number = GRID_SIZE): number {
  return Math.round(value / gridSize) * gridSize;
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
        currCenterX = x + currWidth / 2;
        currCenterY = y + currHeight / 2;
      }
    } else {
      // Circle or no rotation: simple center calculation
      currCenterX = isCircle ? x : x + currWidth / 2;
      currCenterY = isCircle ? y : y + currHeight / 2;
    }
  } else {
    // For rotated objects, calculate actual visual center
    // Konva rotates around the top-left corner (x, y), so we need to find where the center ends up
    const angleRad = (currRotation * Math.PI) / 180;
    const halfWidth = currWidth / 2;
    const halfHeight = currHeight / 2;

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
      // No rotation: simple offset
      return { x: centerX - currWidth / 2, y: centerY - currHeight / 2 };
    }

    // For rotated objects, calculate top-left from desired center
    const angleRad = (currRotation * Math.PI) / 180;
    const halfWidth = currWidth / 2;
    const halfHeight = currHeight / 2;

    // Reverse the center offset calculation
    const centerOffsetX = halfWidth * Math.cos(angleRad) - halfHeight * Math.sin(angleRad);
    const centerOffsetY = halfWidth * Math.sin(angleRad) + halfHeight * Math.cos(angleRad);

    return {
      x: centerX - centerOffsetX,
      y: centerY - centerOffsetY,
    };
  };

  // Canvas center snapping
  if (snapEnabled) {
    const canvasCenterX = width / 2;
    const canvasCenterY = height / 2;

    let snappedCenterX = currCenterX;
    let snappedCenterY = currCenterY;

    // Snap to canvas center (based on object's center)
    if (Math.abs(currCenterX - canvasCenterX) < SNAP_THRESHOLD) {
      snappedCenterX = canvasCenterX;
      guides.push({ type: 'vertical', position: canvasCenterX });
    }

    if (Math.abs(currCenterY - canvasCenterY) < SNAP_THRESHOLD) {
      snappedCenterY = canvasCenterY;
      guides.push({ type: 'horizontal', position: canvasCenterY });
    }

    // Apply both snaps together if any occurred
    if (snappedCenterX !== currCenterX || snappedCenterY !== currCenterY) {
      const newPos = centerToTopLeft(snappedCenterX, snappedCenterY);
      snappedX = newPos.x;
      snappedY = newPos.y;
    }
  }

  // Grid snapping with visual guides (snap both edges and center)
  if (gridEnabled && snapEnabled) {
    // Try snapping object's center to grid
    const gridCenterX = snapToGrid(currCenterX);
    const gridCenterY = snapToGrid(currCenterY);

    // Check if center should snap to grid
    let gridSnappedCenterX = currCenterX;
    let gridSnappedCenterY = currCenterY;

    if (Math.abs(currCenterX - gridCenterX) < SNAP_THRESHOLD && !guides.some(g => g.type === 'vertical')) {
      gridSnappedCenterX = gridCenterX;
      guides.push({ type: 'vertical', position: gridCenterX });
    }

    if (Math.abs(currCenterY - gridCenterY) < SNAP_THRESHOLD && !guides.some(g => g.type === 'horizontal')) {
      gridSnappedCenterY = gridCenterY;
      guides.push({ type: 'horizontal', position: gridCenterY });
    }

    // Apply both grid snaps together if any occurred
    if (gridSnappedCenterX !== currCenterX || gridSnappedCenterY !== currCenterY) {
      const newPos = centerToTopLeft(gridSnappedCenterX, gridSnappedCenterY);
      snappedX = newPos.x;
      snappedY = newPos.y;
    }

    // If center didn't snap, try snapping top-left corner to grid
    if (!guides.some(g => g.type === 'vertical')) {
      const gridX = snapToGrid(x);
      if (Math.abs(x - gridX) < SNAP_THRESHOLD) {
        snappedX = gridX;
        guides.push({ type: 'vertical', position: gridX });
      }
    }

    if (!guides.some(g => g.type === 'horizontal')) {
      const gridY = snapToGrid(y);
      if (Math.abs(y - gridY) < SNAP_THRESHOLD) {
        snappedY = gridY;
        guides.push({ type: 'horizontal', position: gridY });
      }
    }

    console.log('[snapUtils] Grid snapping:', {
      original: { x, y },
      snapped: { x: snappedX, y: snappedY },
      guides: guides.length,
    });
  }

  // Object-to-object snapping (edges and centers)
  if (snapEnabled) {
    const otherObjects = objects.filter((obj) => obj.id !== currentObjectId);

    let closestX: number | null = null;
    let closestY: number | null = null;
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

      const currRight = isCircle ? x + currWidth / 2 : x + currWidth;
      const currBottom = isCircle ? y + currHeight / 2 : y + currHeight;
      const currLeft = isCircle ? x - currWidth / 2 : x;
      const currTop = isCircle ? y - currHeight / 2 : y;

      // Check horizontal alignment (left edge, center, right edge)
      const xDistances = [
        // Left edges align
        { pos: isCircle ? objLeft : objLeft, dist: Math.abs(currLeft - objLeft), guidePosX: objLeft },
        // Right edges align
        { pos: isCircle ? objRight : objRight - currWidth, dist: Math.abs(currRight - objRight), guidePosX: objRight },
        // Centers align
        { pos: isCircle ? objCenterX : objCenterX - currWidth / 2, dist: Math.abs(currCenterX - objCenterX), guidePosX: objCenterX },
        // Current left to obj right
        { pos: isCircle ? objRight : objRight, dist: Math.abs(currLeft - objRight), guidePosX: objRight },
        // Current right to obj left
        { pos: isCircle ? objLeft - currWidth : objLeft - currWidth, dist: Math.abs(currRight - objLeft), guidePosX: objLeft },
      ];

      for (const { pos, dist, guidePosX } of xDistances) {
        if (dist < minXDist) {
          minXDist = dist;
          closestX = pos;
        }
      }

      // Check vertical alignment (top edge, center, bottom edge)
      const yDistances = [
        // Top edges align
        { pos: isCircle ? objTop : objTop, dist: Math.abs(currTop - objTop), guidePosY: objTop },
        // Bottom edges align
        { pos: isCircle ? objBottom : objBottom - currHeight, dist: Math.abs(currBottom - objBottom), guidePosY: objBottom },
        // Centers align
        { pos: isCircle ? objCenterY : objCenterY - currHeight / 2, dist: Math.abs(currCenterY - objCenterY), guidePosY: objCenterY },
        // Current top to obj bottom
        { pos: isCircle ? objBottom : objBottom, dist: Math.abs(currTop - objBottom), guidePosY: objBottom },
        // Current bottom to obj top
        { pos: isCircle ? objTop - currHeight : objTop - currHeight, dist: Math.abs(currBottom - objTop), guidePosY: objTop },
      ];

      for (const { pos, dist, guidePosY } of yDistances) {
        if (dist < minYDist) {
          minYDist = dist;
          closestY = pos;
        }
      }
    }

    // Apply object snapping only if not already snapping to canvas center or grid
    let objSnappedCenterX = currCenterX;
    let objSnappedCenterY = currCenterY;
    let hasObjSnapX = false;
    let hasObjSnapY = false;

    if (closestX !== null && !guides.some(g => g.type === 'vertical')) {
      // Calculate what center position this closestX represents
      if (isCircle) {
        objSnappedCenterX = closestX;
      } else {
        objSnappedCenterX = closestX + currWidth / 2;
      }
      guides.push({ type: 'vertical', position: objSnappedCenterX });
      hasObjSnapX = true;
    }

    if (closestY !== null && !guides.some(g => g.type === 'horizontal')) {
      // Calculate what center position this closestY represents
      if (isCircle) {
        objSnappedCenterY = closestY;
      } else {
        objSnappedCenterY = closestY + currHeight / 2;
      }
      guides.push({ type: 'horizontal', position: objSnappedCenterY });
      hasObjSnapY = true;
    }

    // Apply both object snaps together if any occurred
    if (hasObjSnapX || hasObjSnapY) {
      const newPos = centerToTopLeft(objSnappedCenterX, objSnappedCenterY);
      snappedX = newPos.x;
      snappedY = newPos.y;
    }
  }

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
    const childMinX = child.x;
    const childMinY = child.y;
    let childMaxX = child.x;
    let childMaxY = child.y;

    if ('width' in child && child.width !== undefined) {
      childMaxX = child.x + child.width * (child.scaleX || 1);
    }
    if ('height' in child && child.height !== undefined) {
      childMaxY = child.y + child.height * (child.scaleY || 1);
    }
    if ('radius' in child && child.radius !== undefined) {
      const radiusX = child.radius * (child.scaleX || 1);
      const radiusY = child.radius * (child.scaleY || 1);
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
    case 'text':
      return (obj.width || 0) * (obj.scaleX || 1);
    default:
      return null;
  }
}

function getObjectHeight(obj: CanvasObject): number | null {
  switch (obj.type) {
    case 'rect':
    case 'image':
    case 'gallery-item':
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
