import { Eye, EyeOff, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { CanvasObject } from '@types';

interface LayerPanelProps {
  objects: CanvasObject[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onToggleVisibility: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
}

export function LayerPanel({
  objects,
  selectedIds,
  onSelect,
  onToggleVisibility,
  onDelete,
  onReorder,
}: LayerPanelProps) {
  console.log('[LayerPanel] Rendering', { objectCount: objects.length, selectedCount: selectedIds.length });

  const getObjectIcon = (type: string) => {
    switch (type) {
      case 'rect':
        return '▢';
      case 'circle':
        return '●';
      case 'text':
        return 'T';
      case 'image':
        return '🖼️';
      case 'line':
        return '—';
      case 'gallery-item':
        return '📦';
      default:
        return '•';
    }
  };

  const getObjectName = (obj: CanvasObject) => {
    if (obj.name) return obj.name;
    if (obj.type === 'text' && 'text' in obj) {
      return obj.text.slice(0, 20) || 'Text';
    }
    return `${obj.type.charAt(0).toUpperCase() + obj.type.slice(1)} ${obj.id.slice(0, 4)}`;
  };

  return (
    <div className="bg-base-200 border-l border-base-300 w-64 flex flex-col h-full">
      <div className="p-3 border-b border-base-300">
        <h3 className="font-bold text-sm">Layers</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {objects.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No objects yet. Add some from the toolbar!
          </div>
        ) : (
          <div className="divide-y divide-base-300">
            {objects.map((obj, index) => {
              const isSelected = selectedIds.includes(obj.id);
              const isVisible = obj.visible !== false;

              return (
                <div
                  key={obj.id}
                  className={`p-2 flex items-center gap-2 cursor-pointer hover:bg-base-300 transition-colors ${
                    isSelected ? 'bg-primary/20 border-l-2 border-primary' : ''
                  }`}
                  onClick={() => onSelect([obj.id])}
                >
                  {/* Object Icon */}
                  <span className="text-lg w-6 text-center">{getObjectIcon(obj.type)}</span>

                  {/* Object Name */}
                  <span className={`flex-1 text-sm truncate ${!isVisible ? 'opacity-50' : ''}`}>
                    {getObjectName(obj)}
                  </span>

                  {/* Visibility Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility(obj.id);
                    }}
                    className="btn btn-ghost btn-xs"
                  >
                    {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>

                  {/* Reorder Buttons */}
                  <div className="flex flex-col">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReorder(obj.id, 'up');
                      }}
                      className="btn btn-ghost btn-xs p-0 h-3"
                      disabled={index === 0}
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReorder(obj.id, 'down');
                      }}
                      className="btn btn-ghost btn-xs p-0 h-3"
                      disabled={index === objects.length - 1}
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this object?')) {
                        onDelete(obj.id);
                      }
                    }}
                    className="btn btn-ghost btn-xs text-error"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
