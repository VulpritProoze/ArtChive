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
  height: number
): SnapResult {
  let snappedX = x;
  let snappedY = y;
  const guides: SnapGuide[] = [];

  // Grid snapping
  if (gridEnabled) {
    snappedX = snapToGrid(snappedX);
    snappedY = snapToGrid(snappedY);
  }

  // Object snapping
  if (snapEnabled) {
    const otherObjects = objects.filter((obj) => obj.id !== currentObjectId);

    // Find nearby edges
    let closestX: number | null = null;
    let closestY: number | null = null;
    let minXDist = SNAP_THRESHOLD;
    let minYDist = SNAP_THRESHOLD;

    for (const obj of otherObjects) {
      const objRight = obj.x + (getObjectWidth(obj) || 0);
      const objBottom = obj.y + (getObjectHeight(obj) || 0);

      // Check horizontal alignment
      const xDistances = [
        { pos: obj.x, dist: Math.abs(x - obj.x) },
        { pos: objRight, dist: Math.abs(x - objRight) },
      ];

      for (const { pos, dist } of xDistances) {
        if (dist < minXDist) {
          minXDist = dist;
          closestX = pos;
        }
      }

      // Check vertical alignment
      const yDistances = [
        { pos: obj.y, dist: Math.abs(y - obj.y) },
        { pos: objBottom, dist: Math.abs(y - objBottom) },
      ];

      for (const { pos, dist } of yDistances) {
        if (dist < minYDist) {
          minYDist = dist;
          closestY = pos;
        }
      }
    }

    if (closestX !== null) {
      snappedX = closestX;
      guides.push({ type: 'vertical', position: closestX });
    }

    if (closestY !== null) {
      snappedY = closestY;
      guides.push({ type: 'horizontal', position: closestY });
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
