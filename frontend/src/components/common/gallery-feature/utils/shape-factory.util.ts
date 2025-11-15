import type { CanvasObject } from '@types';

// Generate unique ID helper
const generateId = () => Math.random().toString(36).substring(2, 15);

export interface ShapeDefinition {
  id: string;
  name: string;
  category: 'basic' | 'advanced';
  icon: string; // Emoji or icon identifier
  description?: string;
  comingSoon?: boolean;
}

// Shape definitions catalog
export const SHAPE_DEFINITIONS: ShapeDefinition[] = [
  // Basic Shapes
  { id: 'rectangle', name: 'Rectangle', category: 'basic', icon: '▭', description: 'Simple rectangle shape' },
  { id: 'circle', name: 'Circle', category: 'basic', icon: '●', description: 'Simple circle shape' },
  { id: 'line', name: 'Line', category: 'basic', icon: '─', description: 'Straight line' },

  // Advanced Shapes
  { id: 'triangle', name: 'Triangle', category: 'advanced', icon: '▲', description: 'Triangle shape' },
  { id: 'star', name: 'Star', category: 'advanced', icon: '★', description: '5-pointed star' },
  { id: 'arrow', name: 'Arrow', category: 'advanced', icon: '→', description: 'Right arrow', comingSoon: true },
  { id: 'double-arrow', name: 'Double Arrow', category: 'advanced', icon: '↔', description: 'Double-headed arrow', comingSoon: true },
  { id: 'pentagon', name: 'Pentagon', category: 'advanced', icon: '⬟', description: '5-sided polygon', comingSoon: true },
  { id: 'hexagon', name: 'Hexagon', category: 'advanced', icon: '⬡', description: '6-sided polygon', comingSoon: true },
  { id: 'diamond', name: 'Diamond', category: 'advanced', icon: '◆', description: 'Diamond shape' },
  { id: 'heart', name: 'Heart', category: 'advanced', icon: '♥', description: 'Heart shape', comingSoon: true },
  { id: 'cloud', name: 'Cloud', category: 'advanced', icon: '☁', description: 'Cloud text box', comingSoon: true },
  { id: 'callout', name: 'Callout', category: 'advanced', icon: '💬', description: 'Speech bubble', comingSoon: true },
];

// Shape factory functions
export const createShape = (shapeType: string, x: number = 100, y: number = 100): CanvasObject | null => {
  const defaultProps = {
    id: generateId(),
    x,
    y,
    draggable: true,
    fill: '#3b82f6',
    stroke: '#1e40af',
    strokeWidth: 2,
  };

  switch (shapeType) {
    case 'rectangle':
      return {
        ...defaultProps,
        type: 'rect',
        width: 200,
        height: 150,
      };

    case 'circle':
      return {
        ...defaultProps,
        type: 'circle',
        radius: 75,
      };

    case 'line':
      return {
        ...defaultProps,
        type: 'line',
        points: [0, 0, 200, 0],
        stroke: '#000000',
        lineCap: 'round',
        lineJoin: 'round',
      };

    case 'triangle':
      return {
        id: generateId(),
        type: 'triangle' as const,
        x,
        y,
        draggable: true,
        points: [0, 100, 50, 0, 100, 100, 0, 100], // Triangle path
        stroke: '#1e40af',
        strokeWidth: 2,
        fill: '#3b82f6',
        closed: true,
      } as unknown as CanvasObject;

    case 'star':
      return {
        id: generateId(),
        type: 'star' as const,
        x,
        y,
        draggable: true,
        points: createStarPoints(50, 5), // 5-pointed star
        stroke: '#1e40af',
        strokeWidth: 2,
        fill: '#3b82f6',
        closed: true,
      } as unknown as CanvasObject;

    case 'diamond':
      return {
        id: generateId(),
        type: 'diamond' as const,
        x,
        y,
        draggable: true,
        points: [50, 0, 100, 50, 50, 100, 0, 50, 50, 0], // Diamond path
        stroke: '#1e40af',
        strokeWidth: 2,
        fill: '#3b82f6',
        closed: true,
      } as unknown as CanvasObject;

    default:
      return null;
  }
};

// Helper function to create star points
function createStarPoints(radius: number, points: number): number[] {
  const innerRadius = radius * 0.4;
  const angleStep = (Math.PI * 2) / (points * 2);
  const coords: number[] = [];

  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? radius : innerRadius;
    const angle = i * angleStep - Math.PI / 2; // Start from top
    coords.push(50 + r * Math.cos(angle)); // x
    coords.push(50 + r * Math.sin(angle)); // y
  }

  // Close the path
  coords.push(coords[0]);
  coords.push(coords[1]);

  return coords;
}
