import { useState } from 'react';
import { X, Search, Shapes, LayoutTemplate } from 'lucide-react';
import type { Template, CanvasObject } from '@types';
import { SHAPE_DEFINITIONS, createShape } from './utils/shape-factory.util';
import { galleryTemplates } from '@/data/templates';

interface ObjectsLibraryModalProps {
  onAddShape: (shape: CanvasObject) => void;
  onSelectTemplate: (template: Template) => void;
  onClose: () => void;
}

type TabType = 'shapes' | 'templates';

export function ObjectsLibraryModal({
  onAddShape,
  onSelectTemplate,
  onClose,
}: ObjectsLibraryModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('shapes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'basic' | 'advanced'>('all');

  const handleShapeClick = (shapeType: string, comingSoon?: boolean) => {
    if (comingSoon) {
      return; // Do nothing for coming soon shapes
    }

    const shape = createShape(shapeType);
    if (shape) {
      // Type assertion needed because createShape may return triangle/star/diamond types
      onAddShape(shape as any);
      onClose();
    }
  };

  const handleTemplateClick = (template: Template) => {
    // Type assertion needed because Template from canvas.ts uses GroupObject, but gallery.type.ts uses GalleryItemObject
    onSelectTemplate(template as any);
    onClose();
  };

  // Filter shapes based on search and category
  const filteredShapes = SHAPE_DEFINITIONS.filter((shape) => {
    const matchesSearch = shape.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || shape.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Filter templates based on search
  const filteredTemplates = galleryTemplates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-base-300">
          <h2 className="text-2xl font-bold">Objects Library</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-base-300 px-6">
          <button
            onClick={() => setActiveTab('shapes')}
            className={`flex items-center gap-2 px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'shapes'
                ? 'border-primary text-primary'
                : 'border-transparent text-base-content/60 hover:text-base-content'
            }`}
          >
            <Shapes className="w-4 h-4" />
            Shapes
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'templates'
                ? 'border-primary text-primary'
                : 'border-transparent text-base-content/60 hover:text-base-content'
            }`}
          >
            <LayoutTemplate className="w-4 h-4" />
            Templates
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-base-300">
          <div className="flex gap-4 items-center">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input input-bordered w-full pl-10"
              />
            </div>

            {/* Category Filter (Shapes only) */}
            {activeTab === 'shapes' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`btn btn-sm ${
                    selectedCategory === 'all' ? 'btn-primary' : 'btn-outline'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectedCategory('basic')}
                  className={`btn btn-sm ${
                    selectedCategory === 'basic' ? 'btn-primary' : 'btn-outline'
                  }`}
                >
                  Basic
                </button>
                <button
                  onClick={() => setSelectedCategory('advanced')}
                  className={`btn btn-sm ${
                    selectedCategory === 'advanced' ? 'btn-primary' : 'btn-outline'
                  }`}
                >
                  Advanced
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'shapes' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredShapes.map((shape) => (
                <button
                  key={shape.id}
                  onClick={() => handleShapeClick(shape.id, shape.comingSoon)}
                  disabled={shape.comingSoon}
                  className={`relative card bg-base-200 shadow hover:shadow-lg transition-all p-6 text-center ${
                    shape.comingSoon ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'
                  }`}
                >
                  {/* Shape Icon */}
                  <div className="text-5xl mb-3">{shape.icon}</div>

                  {/* Shape Name */}
                  <h3 className="font-semibold text-sm">{shape.name}</h3>

                  {/* Description */}
                  {shape.description && (
                    <p className="text-xs text-base-content/60 mt-1">{shape.description}</p>
                  )}

                  {/* Coming Soon Badge */}
                  {shape.comingSoon && (
                    <div className="absolute top-2 right-2">
                      <div className="badge badge-sm badge-warning">Soon</div>
                    </div>
                  )}
                </button>
              ))}

              {filteredShapes.length === 0 && (
                <div className="col-span-full text-center py-12 text-base-content/60">
                  <Shapes className="w-16 h-16 mx-auto mb-4 opacity-40" />
                  <p>No shapes found matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleTemplateClick(template)}
                  className="card bg-base-200 shadow cursor-pointer hover:shadow-lg transition-all"
                >
                  <div className="card-body p-4">
                    {/* Template Preview Placeholder */}
                    <div className="bg-base-300 rounded h-40 flex items-center justify-center mb-3">
                      <div className="text-4xl opacity-50">
                        {template.id === 'classic-frame' && '🖼️'}
                        {template.id === 'modern-card' && '📱'}
                        {template.id === 'text-overlay' && '📝'}
                        {template.id === 'gallery-grid' && '▦'}
                        {template.id === 'info-card' && '📋'}
                      </div>
                    </div>

                    <h3 className="font-bold text-sm">{template.name}</h3>
                    <p className="text-xs text-gray-500">{template.description}</p>
                  </div>
                </div>
              ))}

              {filteredTemplates.length === 0 && (
                <div className="col-span-full text-center py-12 text-base-content/60">
                  <LayoutTemplate className="w-16 h-16 mx-auto mb-4 opacity-40" />
                  <p>No templates found matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-base-300">
          <div className="text-sm text-base-content/60">
            {activeTab === 'shapes'
              ? `${filteredShapes.length} shape${filteredShapes.length !== 1 ? 's' : ''} available`
              : `${filteredTemplates.length} template${filteredTemplates.length !== 1 ? 's' : ''} available`}
          </div>
          <button onClick={onClose} className="btn btn-ghost">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
