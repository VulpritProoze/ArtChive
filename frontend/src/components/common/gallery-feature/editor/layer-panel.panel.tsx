import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Trash2, ChevronUp, ChevronDown, ChevronRight, ChevronDown as ChevronDownExpand, Copy, ClipboardPaste, Image } from 'lucide-react';
import type { CanvasObject } from '@types';

interface LayerPanelProps {
  objects: CanvasObject[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onToggleVisibility: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
  onCopy?: () => void;
  onPaste?: (afterObjectId: string | null) => void;
  onDetachImage?: (frameId: string) => void;
  clipboardLength?: number;
  findObject?: (id: string) => CanvasObject | null;
}

export function LayerPanel({
  objects,
  selectedIds,
  onSelect,
  onToggleVisibility,
  onDelete,
  onReorder,
  onCopy,
  onPaste,
  onDetachImage,
  clipboardLength = 0,
  findObject,
}: LayerPanelProps) {
  // Track which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  // Track context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; objectId: string } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

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

  // Close context menu on click outside or right-click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleContextMenu = (e: MouseEvent) => {
      // Close menu if right-clicking elsewhere
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      // Use a slight delay to prevent immediate closure from the same right-click event
      const timeoutId = setTimeout(() => {
        window.addEventListener('click', handleClick);
        window.addEventListener('contextmenu', handleContextMenu);
      }, 10);
      
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('click', handleClick);
        window.removeEventListener('contextmenu', handleContextMenu);
      };
    }
  }, [contextMenu]);

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
      case 'frame':
        return '🖼️';
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

  // Helper function to render a layer item (can be recursive for groups and frames)
  const renderLayerItem = (obj: CanvasObject, index: number, depth: number = 0) => {
    const isSelected = selectedIds.includes(obj.id);
    const isVisible = obj.visible !== false;
    const isGroup = obj.type === 'group';
    const isFrame = obj.type === 'frame';
    const isContainer = isGroup || isFrame; // Both groups and frames can have children
    const isExpanded = isContainer && expandedGroups.has(obj.id);
    const hasChildren = isContainer && 'children' in obj && obj.children && obj.children.length > 0;

    return (
      <div key={obj.id}>
        {/* Main layer item */}
        <div
          className={`p-2 flex items-center gap-2 cursor-pointer hover:bg-base-300 transition-colors ${
            isSelected ? 'bg-primary/20 border-l-2 border-primary' : ''
          }`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={(e) => handleLayerClick(e, obj.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Use clientX and clientY for fixed positioning
            setContextMenu({ 
              x: e.clientX, 
              y: e.clientY, 
              objectId: obj.id 
            });
          }}
        >
          {/* Expand/Collapse icon for groups and frames */}
          {isContainer && hasChildren ? (
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
            <span className="w-4" /> // Spacer for non-containers
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

        {/* Render children if container (group or frame) is expanded */}
        {isContainer && isExpanded && hasChildren && (
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
    <div className="bg-base-200 flex flex-col h-full relative">
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

      {/* Context Menu */}
      {contextMenu && (() => {
        const obj = findObject ? findObject(contextMenu.objectId) : objects.find(o => o.id === contextMenu.objectId);
        const isFrame = obj?.type === 'frame';
        const frameHasImage = isFrame && obj && 'children' in obj && obj.children && obj.children.length > 0;
        const hasSelectedObjects = selectedIds.length > 0;
        const hasClipboard = clipboardLength > 0;
        const clickedObjectIsSelected = selectedIds.includes(contextMenu.objectId);
        
        // Show Copy if there are selected objects, or always show it to copy the clicked object
        const showCopy = onCopy; // Always show copy option
        const showPaste = hasClipboard && onPaste;
        const showDetach = isFrame && frameHasImage && onDetachImage;
        
        // Don't render menu if there are no actions
        if (!showCopy && !showPaste && !showDetach) {
          return null;
        }
        
        return (
          <div
            ref={contextMenuRef}
            className="fixed bg-base-200 border border-base-300 rounded-lg shadow-lg py-1 z-[9999] min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {showCopy && (
              <button
                className="w-full px-4 py-2 text-left hover:bg-base-300 flex items-center gap-2"
                onClick={() => {
                  // If clicked object is not selected, select it first then copy
                  if (!clickedObjectIsSelected && !hasSelectedObjects) {
                    onSelect([contextMenu.objectId]);
                  }
                  if (onCopy) {
                    onCopy();
                  }
                  setContextMenu(null);
                }}
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
            )}
            {showPaste && (
              <button
                className="w-full px-4 py-2 text-left hover:bg-base-300 flex items-center gap-2"
                onClick={() => {
                  if (onPaste) {
                    onPaste(contextMenu.objectId);
                  }
                  setContextMenu(null);
                }}
              >
                <ClipboardPaste className="w-4 h-4" />
                Paste Below
              </button>
            )}
            {showDetach && (
              <button
                className="w-full px-4 py-2 text-left hover:bg-base-300 flex items-center gap-2"
                onClick={() => {
                  if (onDetachImage) {
                    onDetachImage(contextMenu.objectId);
                  }
                  setContextMenu(null);
                }}
              >
                <Image className="w-4 h-4" />
                Detach Image
              </button>
            )}
          </div>
        );
      })()}
    </div>
  );
}
