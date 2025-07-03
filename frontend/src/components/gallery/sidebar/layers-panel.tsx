import React, { useState} from 'react';
import type { Layer, Shape } from '../types';

interface LayersPanelProps {
  layers: Layer[];
  updateShape: (id: string, updates: Partial<Shape>) => void;
  moveLayer: (layerId: string, direction: 'up' | 'down') => void;
  setSelectedId: (id: string | null) => void;
}

const LayersPanel: React.FC<LayersPanelProps> = ({ layers, updateShape, moveLayer, setSelectedId }) => {
  const [dragId, setDragId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, layerId: string) => {
    setDragId(layerId);
    e.dataTransfer.setData('text/plain', layerId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetLayerId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetLayerId) return;

    const sourceIndex = layers.findIndex((layer) => layer.id === dragId);
    const targetIndex = layers.findIndex((layer) => layer.id === targetLayerId);

    if (sourceIndex < targetIndex) {
      for (let i = sourceIndex; i < targetIndex; i++) {
        moveLayer(dragId, 'down');
      }
    } else {
      for (let i = sourceIndex; i > targetIndex; i--) {
        moveLayer(dragId, 'up');
      }
    }
    setDragId(null);
  };

  return (
    <div className="bg-white p-2 rounded shadow">
      <h3 className="text-sm font-bold mb-2">Layers</h3>
      {layers
        .slice()
        .reverse()
        .filter((layer) => layer.shape)
        .map((layer) => (
          <div
            key={layer.id}
            className="mb-2"
            draggable
            onDragStart={(e) => handleDragStart(e, layer.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, layer.id)}
          >
            <div
              className={`flex justify-between items-center p-1 bg-gray-100 cursor-pointer ${
                dragId === layer.id ? 'opacity-50' : 'hover:bg-gray-200'
              }`}
              onClick={() => setSelectedId(layer.shape.id)}
            >
              <span>{layer.name} ({layer.shape.type})</span>
              <div>
                <button
                  className="btn btn-xs btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveLayer(layer.id, 'up');
                  }}
                  disabled={layers.indexOf(layer) === 0}
                >
                  ↓
                </button>
                <button
                  className="btn btn-xs btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveLayer(layer.id, 'down');
                  }}
                  disabled={layers.indexOf(layer) === layers.length - 1}
                >
                  ↑
                </button>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
};

export default LayersPanel;