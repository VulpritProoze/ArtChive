import { useState, useEffect } from 'react';
import type { CanvasObject } from '@types';

interface PropertiesPanelProps {
  selectedObjects: CanvasObject[];
  onUpdate: (id: string, updates: Partial<CanvasObject>) => void;
}

export function PropertiesPanel({ selectedObjects, onUpdate }: PropertiesPanelProps) {
  console.log('[PropertiesPanel] Rendering', { selectedCount: selectedObjects.length });

  const [localValues, setLocalValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (selectedObjects.length === 1) {
      setLocalValues(selectedObjects[0]);
    }
  }, [selectedObjects]);

  if (selectedObjects.length === 0) {
    return (
      <div className="bg-base-200 border-l border-base-300 w-64 p-4">
        <p className="text-sm text-gray-500">Select an object to edit properties</p>
      </div>
    );
  }

  if (selectedObjects.length > 1) {
    return (
      <div className="bg-base-200 border-l border-base-300 w-64 p-4">
        <p className="text-sm text-gray-500">Multiple objects selected</p>
        <p className="text-xs text-gray-400 mt-2">Multi-edit coming soon!</p>
      </div>
    );
  }

  const obj = selectedObjects[0];

  const handleChange = (key: string, value: any) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }));
    onUpdate(obj.id, { [key]: value });
  };

  return (
    <div className="bg-base-200 border-l border-base-300 w-64 flex flex-col h-full overflow-y-auto">
      <div className="p-3 border-b border-base-300">
        <h3 className="font-bold text-sm">Properties</h3>
        <p className="text-xs text-gray-500 capitalize">{obj.type}</p>
      </div>

      <div className="p-3 space-y-4">
        {/* Position */}
        <div>
          <label className="label label-text text-xs font-semibold">Position</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">X</label>
              <input
                type="number"
                className="input input-xs input-bordered w-full"
                value={Math.round(localValues.x || 0)}
                onChange={(e) => handleChange('x', parseFloat(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Y</label>
              <input
                type="number"
                className="input input-xs input-bordered w-full"
                value={Math.round(localValues.y || 0)}
                onChange={(e) => handleChange('y', parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Size (for objects with width/height) */}
        {('width' in obj || 'radius' in obj) && (
          <div>
            <label className="label label-text text-xs font-semibold">Size</label>
            {obj.type === 'circle' ? (
              <div>
                <label className="text-xs text-gray-500">Radius</label>
                <input
                  type="number"
                  className="input input-xs input-bordered w-full"
                  value={Math.round(localValues.radius || 0)}
                  onChange={(e) => handleChange('radius', parseFloat(e.target.value))}
                  min="1"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Width</label>
                  <input
                    type="number"
                    className="input input-xs input-bordered w-full"
                    value={Math.round(localValues.width || 0)}
                    onChange={(e) => handleChange('width', parseFloat(e.target.value))}
                    min="1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Height</label>
                  <input
                    type="number"
                    className="input input-xs input-bordered w-full"
                    value={Math.round(localValues.height || 0)}
                    onChange={(e) => handleChange('height', parseFloat(e.target.value))}
                    min="1"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rotation */}
        <div>
          <label className="label label-text text-xs font-semibold">Rotation</label>
          <input
            type="range"
            className="range range-xs"
            min="0"
            max="360"
            value={localValues.rotation || 0}
            onChange={(e) => handleChange('rotation', parseFloat(e.target.value))}
          />
          <div className="text-xs text-center">{Math.round(localValues.rotation || 0)}°</div>
        </div>

        {/* Opacity */}
        <div>
          <label className="label label-text text-xs font-semibold">Opacity</label>
          <input
            type="range"
            className="range range-xs"
            min="0"
            max="1"
            step="0.1"
            value={localValues.opacity ?? 1}
            onChange={(e) => handleChange('opacity', parseFloat(e.target.value))}
          />
          <div className="text-xs text-center">{Math.round((localValues.opacity ?? 1) * 100)}%</div>
        </div>

        {/* Fill Color (for shapes) */}
        {('fill' in obj) && (
          <div>
            <label className="label label-text text-xs font-semibold">Fill Color</label>
            <input
              type="color"
              className="w-full h-8 rounded cursor-pointer"
              value={localValues.fill || '#000000'}
              onChange={(e) => handleChange('fill', e.target.value)}
            />
          </div>
        )}

        {/* Stroke */}
        {('stroke' in obj) && (
          <>
            <div>
              <label className="label label-text text-xs font-semibold">Stroke Color</label>
              <input
                type="color"
                className="w-full h-8 rounded cursor-pointer"
                value={localValues.stroke || '#000000'}
                onChange={(e) => handleChange('stroke', e.target.value)}
              />
            </div>
            <div>
              <label className="label label-text text-xs font-semibold">Stroke Width</label>
              <input
                type="number"
                className="input input-xs input-bordered w-full"
                value={localValues.strokeWidth || 0}
                onChange={(e) => handleChange('strokeWidth', parseFloat(e.target.value))}
                min="0"
              />
            </div>
          </>
        )}

        {/* Text Properties */}
        {obj.type === 'text' && (
          <>
            <div>
              <label className="label label-text text-xs font-semibold">Text</label>
              <textarea
                className="textarea textarea-bordered textarea-xs w-full"
                value={localValues.text || ''}
                onChange={(e) => handleChange('text', e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <label className="label label-text text-xs font-semibold">Font Size</label>
              <input
                type="number"
                className="input input-xs input-bordered w-full"
                value={localValues.fontSize || 16}
                onChange={(e) => handleChange('fontSize', parseFloat(e.target.value))}
                min="1"
              />
            </div>
            <div>
              <label className="label label-text text-xs font-semibold">Font Family</label>
              <select
                className="select select-xs select-bordered w-full"
                value={localValues.fontFamily || 'Arial'}
                onChange={(e) => handleChange('fontFamily', e.target.value)}
              >
                <option>Arial</option>
                <option>Times New Roman</option>
                <option>Courier New</option>
                <option>Georgia</option>
                <option>Verdana</option>
              </select>
            </div>
            <div>
              <label className="label label-text text-xs font-semibold">Alignment</label>
              <select
                className="select select-xs select-bordered w-full"
                value={localValues.align || 'left'}
                onChange={(e) => handleChange('align', e.target.value)}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
          </>
        )}

        {/* Image Properties */}
        {obj.type === 'image' && (
          <div>
            <label className="label label-text text-xs font-semibold">Image URL</label>
            <input
              type="text"
              className="input input-xs input-bordered w-full"
              value={localValues.src || ''}
              onChange={(e) => handleChange('src', e.target.value)}
              readOnly
            />
          </div>
        )}
      </div>
    </div>
  );
}
