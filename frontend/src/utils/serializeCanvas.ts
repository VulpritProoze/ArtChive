import type { CanvasObject, CanvasState } from '@types';

export function serializeCanvas(state: CanvasState): string {
  return JSON.stringify(state, null, 2);
}

export function deserializeCanvas(json: string): CanvasState | null {
  try {
    const parsed = JSON.parse(json);

    // Validate structure
    if (!parsed.objects || !Array.isArray(parsed.objects)) {
      throw new Error('Invalid canvas state: missing objects array');
    }

    // Validate each object has required fields
    for (const obj of parsed.objects) {
      if (!obj.id || !obj.type) {
        throw new Error(`Invalid object: missing id or type`);
      }
    }

    return parsed as CanvasState;
  } catch (error) {
    console.error('Failed to deserialize canvas:', error);
    return null;
  }
}

export function validateCanvasObject(obj: any): obj is CanvasObject {
  if (!obj || typeof obj !== 'object') return false;
  if (!obj.id || typeof obj.id !== 'string') return false;
  if (!obj.type || typeof obj.type !== 'string') return false;
  if (typeof obj.x !== 'number' || typeof obj.y !== 'number') return false;

  // Type-specific validation
  switch (obj.type) {
    case 'rect':
      return typeof obj.width === 'number' && typeof obj.height === 'number';
    case 'circle':
      return typeof obj.radius === 'number';
    case 'text':
      return typeof obj.text === 'string';
    case 'image':
      return (
        typeof obj.src === 'string' &&
        typeof obj.width === 'number' &&
        typeof obj.height === 'number'
      );
    case 'line':
      return Array.isArray(obj.points);
    case 'gallery-item':
      return (
        typeof obj.width === 'number' &&
        typeof obj.height === 'number' &&
        Array.isArray(obj.children)
      );
    default:
      return false;
  }
}

export function cloneObject(obj: CanvasObject): CanvasObject {
  return JSON.parse(JSON.stringify(obj));
}
