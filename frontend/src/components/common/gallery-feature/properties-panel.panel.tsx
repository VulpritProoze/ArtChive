import { useState, useEffect } from 'react';
import type { CanvasObject } from '@types';

interface PropertiesPanelProps {
  selectedObjects: CanvasObject[];
  onUpdate: (id: string, updates: Partial<CanvasObject>) => void;
}

export function PropertiesPanel({ selectedObjects, onUpdate }: PropertiesPanelProps) {
  const [localValues, setLocalValues] = useState<Record<string, any>>({});
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (selectedObjects.length === 1 && !isDragging) {
      setLocalValues(selectedObjects[0]);
    }
  }, [selectedObjects, isDragging]);

  if (selectedObjects.length === 0) {
    return (
      <div className="bg-base-200 flex flex-col h-full">
        <div className="p-3 border-b border-base-300 shrink-0">
          <h3 className="font-bold text-sm">Properties</h3>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-500">Select an object to edit properties</p>
        </div>
      </div>
    );
  }

  if (selectedObjects.length > 1) {
    return (
      <div className="bg-base-200 flex flex-col h-full">
        <div className="p-3 border-b border-base-300 shrink-0">
          <h3 className="font-bold text-sm">Properties</h3>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-500">Multiple objects selected</p>
          <p className="text-xs text-gray-400 mt-2">Multi-edit coming soon!</p>
        </div>
      </div>
    );
  }

  const obj = selectedObjects[0];

  const handleChange = (key: string, value: any) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }));
    onUpdate(obj.id, { [key]: value });
  };

  const handleSliderChange = (key: string, value: any) => {
    // Only update local state while dragging
    setLocalValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSliderCommit = (key: string, value: any) => {
    // Commit to actual state when done dragging
    onUpdate(obj.id, { [key]: value });
    setIsDragging(false);
  };

  return (
    <div className="bg-base-200 flex flex-col h-full">
      <div className="p-3 border-b border-base-300 shrink-0">
        <h3 className="font-bold text-sm">Properties</h3>
        <p className="text-xs text-gray-500 capitalize">{obj.type}</p>
      </div>

      <div className="p-3 space-y-4 overflow-y-auto flex-1 min-h-0">
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

        {/* Size (for objects with width/height, but not for groups, text, or lines) */}
        {/* Note: lines don't have width/height, so they're already excluded by the 'width' in obj check */}
        {('width' in obj || 'radius' in obj) && obj.type !== 'group' && obj.type !== 'text' && (
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
            onInput={(e) => {
              setIsDragging(true);
              handleSliderChange('rotation', parseFloat((e.target as HTMLInputElement).value));
            }}
            onChange={(e) => handleSliderCommit('rotation', parseFloat(e.target.value))}
            onMouseUp={(e) => handleSliderCommit('rotation', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleSliderCommit('rotation', parseFloat((e.target as HTMLInputElement).value))}
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
            onInput={(e) => {
              setIsDragging(true);
              handleSliderChange('opacity', parseFloat((e.target as HTMLInputElement).value));
            }}
            onChange={(e) => handleSliderCommit('opacity', parseFloat(e.target.value))}
            onMouseUp={(e) => handleSliderCommit('opacity', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleSliderCommit('opacity', parseFloat((e.target as HTMLInputElement).value))}
          />
          <div className="text-xs text-center">{Math.round((localValues.opacity ?? 1) * 100)}%</div>
        </div>

        {/* Fill Color (for shapes) */}
        {('fill' in obj) && (
          <div>
            <label className="label label-text text-xs font-semibold">Fill</label>

            {/* Transparent Fill Checkbox */}
            <div className="form-control mb-2">
              <label className="label cursor-pointer py-1 px-0 justify-start gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  checked={localValues.fill === 'transparent'}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleChange('fill', 'transparent');
                    } else {
                      // Restore to a default color when unchecked
                      if (obj.type === 'frame') {
                        handleChange('fill', 'rgba(200, 200, 255, 0.1)');
                      } else {
                        handleChange('fill', '#3b82f6');
                      }
                    }
                  }}
                />
                <span className="label-text text-xs">Transparent Fill</span>
              </label>
            </div>

            {/* Color Picker - convert rgba to hex for frames, show color picker for all */}
            {localValues.fill !== 'transparent' && localValues.fill && (() => {
              // Helper functions to convert rgba to hex and hex to rgba
              const rgbaToHex = (rgba: string): string => {
                const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                if (match) {
                  const r = parseInt(match[1]).toString(16).padStart(2, '0');
                  const g = parseInt(match[2]).toString(16).padStart(2, '0');
                  const b = parseInt(match[3]).toString(16).padStart(2, '0');
                  return `#${r}${g}${b}`;
                }
                return '#000000';
              };

              const hexToRgba = (hex: string, alpha: number = 0.1): string => {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
              };

              // Get current fill value
              const currentFill = localValues.fill || '';
              
              // Determine if it's a frame (which uses rgba) or regular shape (which uses hex)
              const isFrame = obj.type === 'frame';
              
              // Convert rgba to hex for display if it's a frame
              let displayValue = currentFill;
              if (isFrame && currentFill.startsWith('rgba')) {
                displayValue = rgbaToHex(currentFill);
              } else if (!currentFill.startsWith('#') && !currentFill.startsWith('rgba')) {
                // Invalid format, default to black
                displayValue = '#000000';
              }

              // Extract alpha from rgba if it's a frame
              const getAlpha = (rgba: string): number => {
                const match = rgba.match(/rgba?\([\d\s,]+,\s*([\d.]+)\)/);
                return match ? parseFloat(match[1]) : 0.1;
              };

              const currentAlpha = isFrame && currentFill.startsWith('rgba') 
                ? getAlpha(currentFill) 
                : 0.1;

              return (
                <input
                  type="color"
                  className="w-full h-8 rounded cursor-pointer"
                  value={displayValue}
                  onChange={(e) => {
                    if (isFrame) {
                      // For frames, convert hex to rgba with preserved alpha
                      handleChange('fill', hexToRgba(e.target.value, currentAlpha));
                    } else {
                      // For regular shapes, use hex directly
                      handleChange('fill', e.target.value);
                    }
                  }}
                />
              );
            })()}
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
              <label className="label label-text text-xs font-semibold">Text Width (for wrapping)</label>
              <input
                type="number"
                className="input input-xs input-bordered w-full"
                value={Math.round(localValues.width || 200)}
                onChange={(e) => handleChange('width', parseFloat(e.target.value))}
                min="1"
              />
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

        {/* Line Properties */}
        {obj.type === 'line' && (
          <>
            <div>
              <label className="label label-text text-xs font-semibold">Line Cap</label>
              <select
                className="select select-xs select-bordered w-full"
                value={localValues.lineCap || 'round'}
                onChange={(e) => handleChange('lineCap', e.target.value)}
              >
                <option value="butt">Butt</option>
                <option value="round">Round</option>
                <option value="square">Square</option>
              </select>
            </div>
            <div>
              <label className="label label-text text-xs font-semibold">Line Join</label>
              <select
                className="select select-xs select-bordered w-full"
                value={localValues.lineJoin || 'round'}
                onChange={(e) => handleChange('lineJoin', e.target.value)}
              >
                <option value="miter">Miter</option>
                <option value="round">Round</option>
                <option value="bevel">Bevel</option>
              </select>
            </div>
          </>
        )}


        {/* Frame Properties */}
        {obj.type === 'frame' && (
          <>
            <div>
              <label className="label label-text text-xs font-semibold">Placeholder Text</label>
              <input
                type="text"
                className="input input-xs input-bordered w-full"
                value={localValues.placeholder || 'Drop image here'}
                onChange={(e) => handleChange('placeholder', e.target.value)}
              />
            </div>
            <div>
              <label className="label label-text text-xs font-semibold">Dashed Border</label>
              <input
                type="checkbox"
                className="checkbox checkbox-xs"
                checked={localValues.dashEnabled !== false}
                onChange={(e) => handleChange('dashEnabled', e.target.checked)}
              />
            </div>
            {obj.children && obj.children.length > 0 && (
              <div className="p-2 bg-info/10 rounded">
                <p className="text-xs text-info">
                  ✓ Image attached to frame
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
