import React from 'react';
import LayersPanel from './layers-panel';
import PropertiesPanel from './properties-panel';
import type { Layer, Shape } from '../types';

interface SidebarProps {
  layers: Layer[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  moveLayer: (layerId: string, direction: 'up' | 'down') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ layers, selectedId, setSelectedId, updateShape, moveLayer }) => {
  const selectedShape = layers.find((layer) => layer.shape?.id === selectedId)?.shape || null;

  return (
    <div className="w-full bg-gray-200 p-4 flex flex-col gap-4 h-screen z-10">
      <LayersPanel layers={layers} updateShape={updateShape} moveLayer={moveLayer} setSelectedId={setSelectedId} />
      <PropertiesPanel selectedShape={selectedShape} updateShape={updateShape} />
    </div>
  );
};

export default Sidebar;