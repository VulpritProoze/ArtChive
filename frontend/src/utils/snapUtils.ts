import type { CanvasObject } from '@types';

export const GRID_SIZE = 10;
export const SNAP_THRESHOLD = 10;

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
  objectHeight?: number
): SnapResult {
  let snappedX = x;
  let snappedY = y;
  const guides: SnapGuide[] = [];

  // Get current object for center calculations
  const currentObject = objects.find(obj => obj.id === currentObjectId);
  const currWidth = objectWidth || getObjectWidth(currentObject!) || 0;
  const currHeight = objectHeight || getObjectHeight(currentObject!) || 0;
  const currCenterX = x + currWidth / 2;
  const currCenterY = y + currHeight / 2;

  // Canvas center snapping
  if (snapEnabled) {
    const canvasCenterX = width / 2;
    const canvasCenterY = height / 2;

    // Snap to canvas center (based on object's center)
    if (Math.abs(currCenterX - canvasCenterX) < SNAP_THRESHOLD) {
      snappedX = canvasCenterX - currWidth / 2;
      guides.push({ type: 'vertical', position: canvasCenterX });
    }

    if (Math.abs(currCenterY - canvasCenterY) < SNAP_THRESHOLD) {
      snappedY = canvasCenterY - currHeight / 2;
      guides.push({ type: 'horizontal', position: canvasCenterY });
    }
  }

  // Grid snapping with visual guides (snap both edges and center)
  if (gridEnabled && snapEnabled) {
    // Try snapping object's center to grid
    const gridCenterX = snapToGrid(currCenterX);
    const gridCenterY = snapToGrid(currCenterY);

    // Check if center should snap to grid
    if (Math.abs(currCenterX - gridCenterX) < SNAP_THRESHOLD && !guides.some(g => g.type === 'vertical')) {
      snappedX = gridCenterX - currWidth / 2;
      guides.push({ type: 'vertical', position: gridCenterX });
    }

    if (Math.abs(currCenterY - gridCenterY) < SNAP_THRESHOLD && !guides.some(g => g.type === 'horizontal')) {
      snappedY = gridCenterY - currHeight / 2;
      guides.push({ type: 'horizontal', position: gridCenterY });
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
      const objRight = obj.x + objWidth;
      const objBottom = obj.y + objHeight;
      const objCenterX = obj.x + objWidth / 2;
      const objCenterY = obj.y + objHeight / 2;

      const currRight = x + currWidth;
      const currBottom = y + currHeight;

      // Check horizontal alignment (left edge, center, right edge)
      const xDistances = [
        // Left edges align
        { pos: obj.x, dist: Math.abs(x - obj.x) },
        // Right edges align
        { pos: objRight - currWidth, dist: Math.abs(x - (objRight - currWidth)) },
        // Centers align
        { pos: objCenterX - currWidth / 2, dist: Math.abs(currCenterX - objCenterX) },
        // Current left to obj right
        { pos: objRight, dist: Math.abs(x - objRight) },
        // Current right to obj left
        { pos: obj.x - currWidth, dist: Math.abs(currRight - obj.x) },
      ];

      for (const { pos, dist } of xDistances) {
        if (dist < minXDist) {
          minXDist = dist;
          closestX = pos;
        }
      }

      // Check vertical alignment (top edge, center, bottom edge)
      const yDistances = [
        // Top edges align
        { pos: obj.y, dist: Math.abs(y - obj.y) },
        // Bottom edges align
        { pos: objBottom - currHeight, dist: Math.abs(y - (objBottom - currHeight)) },
        // Centers align
        { pos: objCenterY - currHeight / 2, dist: Math.abs(currCenterY - objCenterY) },
        // Current top to obj bottom
        { pos: objBottom, dist: Math.abs(y - objBottom) },
        // Current bottom to obj top
        { pos: obj.y - currHeight, dist: Math.abs(currBottom - obj.y) },
      ];

      for (const { pos, dist } of yDistances) {
        if (dist < minYDist) {
          minYDist = dist;
          closestY = pos;
        }
      }
    }

    // Apply object snapping only if not already snapping to canvas center or grid
    if (closestX !== null && !guides.some(g => g.type === 'vertical')) {
      snappedX = closestX;
      // Calculate guide position based on which alignment was used
      const guidePosX = closestX + currWidth / 2;
      guides.push({ type: 'vertical', position: guidePosX });
    }

    if (closestY !== null && !guides.some(g => g.type === 'horizontal')) {
      snappedY = closestY;
      // Calculate guide position based on which alignment was used
      const guidePosY = closestY + currHeight / 2;
      guides.push({ type: 'horizontal', position: guidePosY });
    }
  }

  return { x: snappedX, y: snappedY, guides };
}

function getObjectWidth(obj: CanvasObject): number | null {
  switch (obj.type) {
    case 'rect':
    case 'image':
    case 'gallery-item':
      return obj.width * (obj.scaleX || 1);
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
