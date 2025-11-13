import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import type { Template } from '@types';
import { galleryTemplates } from '@/data/templates';

interface TemplateLibraryProps {
  onSelectTemplate: (template: Template) => void;
  onClose: () => void;
}

export function TemplateLibrary({ onSelectTemplate, onClose }: TemplateLibraryProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
  };

  const handleInsert = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h2 className="text-xl font-bold">Template Library</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {galleryTemplates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className={`card bg-base-200 shadow cursor-pointer hover:shadow-lg transition-all ${
                  selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
                }`}
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

                  {selectedTemplate?.id === template.id && (
                    <div className="badge badge-primary badge-sm mt-2">Selected</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-base-300">
          <button onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button
            onClick={handleInsert}
            className="btn btn-primary"
            disabled={!selectedTemplate}
          >
            <Plus className="w-4 h-4 mr-1" />
            Insert Template
          </button>
        </div>
      </div>
    </div>
  );
}
