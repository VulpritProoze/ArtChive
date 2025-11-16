import { useState, useRef, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import type { CanvasObject } from '@types/gallery.type';
import { SHAPE_DEFINITIONS, createShape } from './utils/shape-factory.util';

interface ShapesFloatingProps {
  onAddShape: (shape: CanvasObject) => void;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
}

export function ShapesFloating({
  onAddShape,
  onClose,
  buttonRef,
}: ShapesFloatingProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'basic' | 'advanced'>('all');
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Position the floating UI near the button
  useEffect(() => {
    if (buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: buttonRect.bottom + 8,
        left: buttonRect.left,
      });
    }
  }, [buttonRef]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, buttonRef]);

  const handleShapeClick = (shapeType: string, comingSoon?: boolean) => {
    if (comingSoon) {
      return; // Do nothing for coming soon shapes
    }

    const shape = createShape(shapeType);
    if (shape) {
      onAddShape(shape);
      onClose();
    }
  };

  // Filter shapes based on search and category
  const filteredShapes = SHAPE_DEFINITIONS.filter((shape) => {
    const matchesSearch = shape.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || shape.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div
      ref={containerRef}
      className="fixed bg-base-100 rounded-lg shadow-xl border border-base-300 z-50"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: '280px',
        maxHeight: '480px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-base-300">
        <h3 className="font-semibold text-sm">Shapes</h3>
        <button onClick={onClose} className="btn btn-ghost btn-xs btn-circle">
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-base-300">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-base-content/40" />
          <input
            type="text"
            placeholder="Search shapes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input input-bordered input-sm w-full pl-8 text-xs"
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-1 p-3 border-b border-base-300">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`btn btn-xs flex-1 ${
            selectedCategory === 'all' ? 'btn-primary' : 'btn-ghost'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setSelectedCategory('basic')}
          className={`btn btn-xs flex-1 ${
            selectedCategory === 'basic' ? 'btn-primary' : 'btn-ghost'
          }`}
        >
          Basic
        </button>
        <button
          onClick={() => setSelectedCategory('advanced')}
          className={`btn btn-xs flex-1 ${
            selectedCategory === 'advanced' ? 'btn-primary' : 'btn-ghost'
          }`}
        >
          Advanced
        </button>
      </div>

      {/* Shapes Grid */}
      <div className="overflow-y-auto p-3" style={{ maxHeight: '320px' }}>
        <div className="grid grid-cols-3 gap-2">
          {filteredShapes.map((shape) => (
            <button
              key={shape.id}
              onClick={() => handleShapeClick(shape.id, shape.comingSoon)}
              disabled={shape.comingSoon}
              className={`relative flex flex-col items-center justify-center p-3 rounded-lg bg-base-200 hover:bg-base-300 transition-colors ${
                shape.comingSoon ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
              title={shape.name}
            >
              {/* Shape Icon */}
              <div className="text-2xl mb-1">{shape.icon}</div>

              {/* Shape Name */}
              <span className="text-[10px] text-center leading-tight">{shape.name}</span>

              {/* Coming Soon Badge */}
              {shape.comingSoon && (
                <div className="absolute top-1 right-1">
                  <div className="badge badge-xs badge-warning">Soon</div>
                </div>
              )}
            </button>
          ))}
        </div>

        {filteredShapes.length === 0 && (
          <div className="text-center py-8 text-base-content/60">
            <p className="text-xs">No shapes found</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-base-300 text-center">
        <span className="text-[10px] text-base-content/60">
          {filteredShapes.length} shape{filteredShapes.length !== 1 ? 's' : ''} available
        </span>
      </div>
    </div>
  );
}
