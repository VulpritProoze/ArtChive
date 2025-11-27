import { useState, useRef } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';

interface CanvasSizePreset {
  name: string;
  width: number;
  height: number;
  description: string;
}

const CANVAS_PRESETS: CanvasSizePreset[] = [
  { name: 'Square', width: 1080, height: 1080, description: 'Instagram' },
  { name: 'Standard', width: 1920, height: 1080, description: 'Full HD' },
  { name: 'Vertical', width: 1080, height: 1920, description: 'Mobile/Story' },
  { name: 'Wide', width: 2560, height: 1440, description: '2K' },
  { name: 'Ultra-Wide', width: 3440, height: 1440, description: 'Ultrawide' },
  { name: '4K', width: 3840, height: 2160, description: '4K' },
];

interface GalleryCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: GalleryFormData) => Promise<void>;
}

export interface GalleryFormData {
  title: string;
  description: string;
  picture?: File;
  canvas_width: number;
  canvas_height: number;
}

export function GalleryCreationModal({
  isOpen,
  onClose,
  onSubmit,
}: GalleryCreationModalProps) {
  const [formData, setFormData] = useState<GalleryFormData>({
    title: '',
    description: '',
    canvas_width: 1920,
    canvas_height: 1080,
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('Standard');
  const [isCustomSize, setIsCustomSize] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }

      setFormData({ ...formData, picture: file });

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, picture: undefined });
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePresetChange = (presetName: string) => {
    if (presetName === 'Custom') {
      setIsCustomSize(true);
      setSelectedPreset('Custom');
    } else {
      const preset = CANVAS_PRESETS.find((p) => p.name === presetName);
      if (preset) {
        setFormData({
          ...formData,
          canvas_width: preset.width,
          canvas_height: preset.height,
        });
        setSelectedPreset(presetName);
        setIsCustomSize(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('Please enter a gallery title');
      return;
    }

    if (formData.canvas_width < 100 || formData.canvas_width > 10000) {
      alert('Canvas width must be between 100 and 10000 pixels');
      return;
    }

    if (formData.canvas_height < 100 || formData.canvas_height > 10000) {
      alert('Canvas height must be between 100 and 10000 pixels');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(formData);
      handleClose();
    } catch (error) {
      console.error('Failed to create gallery:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      canvas_width: 1920,
      canvas_height: 1080,
    });
    setPreviewUrl(null);
    setSelectedPreset('Standard');
    setIsCustomSize(false);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-2xl mb-6">Create New Gallery</h3>

        <form onSubmit={handleSubmit}>
          {/* Gallery Picture Upload */}
          <div className="form-control mb-6">
            <label className="label">
              <span className="label-text font-semibold">Gallery Cover Picture</span>
              <span className="label-text-alt text-xs">Optional</span>
            </label>

            {previewUrl ? (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg border border-base-300"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 btn btn-sm btn-circle btn-error"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-base-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              >
                <ImageIcon className="w-12 h-12 mx-auto mb-3 text-base-content/40" />
                <p className="text-sm text-base-content/60 mb-2">
                  Click to upload cover image
                </p>
                <p className="text-xs text-base-content/40">
                  PNG, JPG, GIF up to 5MB
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* Title */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">Gallery Title *</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Summer Exhibition 2024"
              className="input input-bordered w-full"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
          </div>

          {/* Description */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">Description</span>
            </label>
            <textarea
              placeholder="Describe your gallery..."
              className="block w-full textarea textarea-bordered h-20"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          {/* Canvas Size Selection */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">Canvas Size</span>
            </label>

            {/* Preset Buttons */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {CANVAS_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handlePresetChange(preset.name)}
                  className={`btn btn-sm ${
                    selectedPreset === preset.name
                      ? 'btn-primary'
                      : 'btn-outline'
                  }`}
                >
                  <div className="text-left">
                    <div className="font-semibold text-xs">{preset.name}</div>
                    <div className="text-[10px] opacity-70">
                      {preset.description}
                    </div>
                  </div>
                </button>
              ))}
              <button
                type="button"
                onClick={() => handlePresetChange('Custom')}
                className={`btn btn-sm ${
                  selectedPreset === 'Custom' ? 'btn-primary' : 'btn-outline'
                }`}
              >
                Custom
              </button>
            </div>

            {/* Custom Size Inputs or Display Current Size */}
            {isCustomSize ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label py-1">
                    <span className="label-text text-xs">Width (px)</span>
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="10000"
                    className="input input-bordered input-sm w-full"
                    value={formData.canvas_width}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        canvas_width: parseInt(e.target.value) || 100,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="label py-1">
                    <span className="label-text text-xs">Height (px)</span>
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="10000"
                    className="input input-bordered input-sm w-full"
                    value={formData.canvas_height}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        canvas_height: parseInt(e.target.value) || 100,
                      })
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="bg-base-200 rounded-lg p-3 text-center">
                <span className="text-sm font-mono">
                  {formData.canvas_width} × {formData.canvas_height} px
                </span>
              </div>
            )}
          </div>

          {/* Info Note */}
          <div className="alert alert-info mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span className="text-sm">New galleries are automatically saved as <strong>Draft</strong>. You can change the status later from your gallery settings.</span>
          </div>

          {/* Modal Actions */}
          <div className="modal-action">
            <button
              type="button"
              onClick={handleClose}
              className="btn"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Creating...
                </>
              ) : (
                'Create & Edit'
              )}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={handleClose} />
    </div>
  );
}
