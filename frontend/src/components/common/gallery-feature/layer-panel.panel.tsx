import { useState } from 'react';
import { Eye, EyeOff, Trash2, ChevronUp, ChevronDown, ChevronRight, ChevronDown as ChevronDownExpand } from 'lucide-react';
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

  // Track which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleLayerClick = (e: React.MouseEvent, objectId: string) => {
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+Click: Toggle selection
      if (selectedIds.includes(objectId)) {
        // Deselect
        onSelect(selectedIds.filter(id => id !== objectId));
      } else {
        // Add to selection
        onSelect([...selectedIds, objectId]);
      }
    } else if (e.shiftKey && selectedIds.length > 0) {
      // Shift+Click: Range select
      const lastSelectedId = selectedIds[selectedIds.length - 1];
      const lastIndex = objects.findIndex(obj => obj.id === lastSelectedId);
      const clickedIndex = objects.findIndex(obj => obj.id === objectId);

      if (lastIndex !== -1 && clickedIndex !== -1) {
        const start = Math.min(lastIndex, clickedIndex);
        const end = Math.max(lastIndex, clickedIndex);
        const rangeIds = objects.slice(start, end + 1).map(obj => obj.id);
        onSelect(rangeIds);
      }
    } else {
      // Normal click: Select only this object
      onSelect([objectId]);
    }
  };

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
      case 'triangle':
        return '▲';
      case 'star':
        return '★';
      case 'diamond':
        return '◆';
      case 'gallery-item':
        return '📦';
      case 'group':
        return '📁';
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

  // Helper function to render a layer item (can be recursive for groups)
  const renderLayerItem = (obj: CanvasObject, index: number, depth: number = 0) => {
    const isSelected = selectedIds.includes(obj.id);
    const isVisible = obj.visible !== false;
    const isGroup = obj.type === 'group';
    const isExpanded = isGroup && expandedGroups.has(obj.id);
    const hasChildren = isGroup && 'children' in obj && obj.children && obj.children.length > 0;

    return (
      <div key={obj.id}>
        {/* Main layer item */}
        <div
          className={`p-2 flex items-center gap-2 cursor-pointer hover:bg-base-300 transition-colors ${
            isSelected ? 'bg-primary/20 border-l-2 border-primary' : ''
          }`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={(e) => handleLayerClick(e, obj.id)}
        >
          {/* Expand/Collapse icon for groups */}
          {isGroup && hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleGroupExpansion(obj.id);
              }}
              className="btn btn-ghost btn-xs p-0 w-4 h-4 min-h-0"
            >
              {isExpanded ? (
                <ChevronDownExpand className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          ) : (
            <span className="w-4" /> // Spacer for non-groups
          )}

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

          {/* Reorder Buttons (only for top-level objects) */}
          {depth === 0 && (
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
          )}

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

        {/* Render children if group is expanded */}
        {isGroup && isExpanded && hasChildren && (
          <div className="bg-base-300/30">
            {'children' in obj && obj.children.map((child: CanvasObject, childIndex: number) =>
              renderLayerItem(child, childIndex, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-base-200 flex flex-col h-full">
      <div className="p-3 border-b border-base-300 shrink-0">
        <h3 className="font-bold text-sm">Layers</h3>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {objects.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No objects yet. Add some from the toolbar!
          </div>
        ) : (
          <div className="divide-y divide-base-300">
            {objects.map((obj, index) => renderLayerItem(obj, index, 0))}
          </div>
        )}
      </div>
    </div>
  );
}
