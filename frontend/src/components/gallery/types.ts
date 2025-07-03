export interface Shape {
  id: string;
  type: 'rect' | 'circle';
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  fill: string;
  fillEnabled: boolean;
  opacity: number;
  stroke: string;
  strokeWidth: number;
  layerId: string;
  rotation: number;
}

export interface Layer {
  id: string;
  name: string;
  shape: Shape;
}

export interface ProjectData {
  layers: Layer[];
}