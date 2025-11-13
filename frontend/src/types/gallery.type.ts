// Gallery and Canvas types for the gallery editor

// ===== Canvas Object Types =====

export type CanvasObjectType = 'rect' | 'circle' | 'text' | 'image' | 'line' | 'gallery-item' | 'group';

export interface BaseCanvasObject {
  id: string;
  type: CanvasObjectType;
  x: number;
  y: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
  draggable?: boolean;
  visible?: boolean;
  name?: string;
  zIndex?: number;
}

export interface RectObject extends BaseCanvasObject {
  type: 'rect';
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
}

export interface CircleObject extends BaseCanvasObject {
  type: 'circle';
  radius: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface TextObject extends BaseCanvasObject {
  type: 'text';
  text: string;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  fontStyle?: string;
  textDecoration?: string;
  align?: string;
  width?: number;
}

export interface ImageObject extends BaseCanvasObject {
  type: 'image';
  src: string;
  width: number;
  height: number;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
}

export interface LineObject extends BaseCanvasObject {
  type: 'line';
  points: number[];
  stroke?: string;
  strokeWidth?: number;
  lineCap?: string;
  lineJoin?: string;
}

export interface GalleryItemObject extends BaseCanvasObject {
  type: 'gallery-item';
  width: number;
  height: number;
  children: CanvasObject[];
  background?: string;
  borderColor?: string;
  borderWidth?: number;
}

export interface GroupObject extends BaseCanvasObject {
  type: 'group';
  children: CanvasObject[];
  width: number;
  height: number;
}

export type CanvasObject =
  | RectObject
  | CircleObject
  | TextObject
  | ImageObject
  | LineObject
  | GalleryItemObject
  | GroupObject;

export interface CanvasState {
  objects: CanvasObject[];
  background?: string;
  width: number;
  height: number;
}

export interface EditorState extends CanvasState {
  selectedIds: string[];
  clipboard: CanvasObject[];
  zoom: number;
  panX: number;
  panY: number;
  gridEnabled: boolean;
  snapEnabled: boolean;
}

export interface Command {
  execute: () => void;
  undo: () => void;
  description: string;
}

export interface Template {
  id: string;
  name: string;
  thumbnail?: string;
  description?: string;
  data: GalleryItemObject;
}

export interface SnapGuide {
  type: 'vertical' | 'horizontal';
  position: number;
}
