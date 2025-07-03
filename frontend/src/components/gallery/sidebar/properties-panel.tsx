import React from 'react';
import type { Layer, Shape } from '../types';

interface PropertiesPanelProps {
  selectedShape: Shape | null;
  updateShape: (id: string, updates: Partial<Shape>) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedShape, updateShape }) => {
  if (!selectedShape) {
    return <div className="p-4">No shape selected</div>;
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-bold mb-4">Properties</h3>
      <div className="mb-4">
        <label className="block mb-2">Fill Color</label>
        <input
          type="color"
          value={selectedShape.fill}
          onChange={(e) =>
            updateShape(selectedShape.id, { fill: e.target.value })
          }
          className="w-full h-8 border rounded"
        />
      </div>
      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={selectedShape.fillEnabled}
            onChange={(e) =>
              updateShape(selectedShape.id, { fillEnabled: e.target.checked })
            }
            className="mr-2"
          />
          Enable Fill
        </label>
      </div>
      <div className="mb-4">
        <label className="block mb-2">Opacity</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={selectedShape.opacity}
          onChange={(e) =>
            updateShape(selectedShape.id, {
              opacity: parseFloat(e.target.value),
            })
          }
          className="w-full"
        />
        <span>{selectedShape.opacity.toFixed(2)}</span>
      </div>
      <div className="mb-4">
        <label className="block mb-2">Stroke Color</label>
        <input
          type="color"
          value={selectedShape.stroke}
          onChange={(e) =>
            updateShape(selectedShape.id, { stroke: e.target.value })
          }
          className="w-full h-8 border rounded"
        />
      </div>
      <div className="mb-4">
        <label className="block mb-2">Stroke Width</label>
        <input
          type="number"
          value={selectedShape.strokeWidth}
          onChange={(e) =>
            updateShape(selectedShape.id, {
              strokeWidth: parseInt(e.target.value),
            })
          }
          className="w-full border rounded p-1"
        />
      </div>
    </div>
  );
};

export default PropertiesPanel;