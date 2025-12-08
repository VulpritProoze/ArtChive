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
      <div className="modal-box max-w-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-secondary text-primary-content px-6 py-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-2xl">Create New Gallery</h3>
              <p className="text-sm opacity-90 mt-1">Set up your virtual art gallery</p>
            </div>
            <button
              onClick={handleClose}
              className="btn btn-sm btn-circle btn-ghost hover:bg-primary-content/20"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1">

        <form id="gallery-form" onSubmit={handleSubmit}>
          {/* Gallery Picture Upload */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2 text-base-content">
              Gallery Cover Picture
              <span className="ml-2 text-xs font-normal text-base-content/60">(Optional)</span>
            </label>

            {previewUrl ? (
              <div className="relative rounded-xl overflow-hidden border-2 border-base-300">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-56 object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-3 right-3 btn btn-sm btn-circle bg-base-100/90 hover:bg-base-100 border border-base-300 shadow-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-base-300 rounded-xl p-10 text-center cursor-pointer hover:border-primary hover:bg-base-200/50 transition-all duration-200"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-base-200 rounded-full">
                    <ImageIcon className="w-8 h-8 text-base-content/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-base-content mb-1">
                      Click to upload cover image
                    </p>
                    <p className="text-xs text-base-content/50">
                      PNG, JPG, GIF up to 5MB
                    </p>
                  </div>
                </div>
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
          <div className="mb-5">
            <label className="block text-sm font-semibold mb-2 text-base-content">
              Gallery Title <span className="text-error">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Summer Exhibition 2024"
              className="w-full px-4 py-3 rounded-lg border border-base-300 bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
          </div>

          {/* Description */}
          <div className="mb-5">
            <label className="block text-sm font-semibold mb-2 text-base-content">
              Description
            </label>
            <textarea
              placeholder="Describe your gallery..."
              className="w-full px-4 py-3 rounded-lg border border-base-300 bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
              rows={4}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          {/* Canvas Size Selection */}
          <div className="mb-5">
            <label className="block text-sm font-semibold mb-3 text-base-content">
              Canvas Size
            </label>

            {/* Preset Buttons */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {CANVAS_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handlePresetChange(preset.name)}
                  className={`
                    px-3 py-2.5 rounded-lg border-2 transition-all duration-200
                    ${
                      selectedPreset === preset.name
                        ? 'border-primary bg-primary/10 text-primary font-semibold shadow-md'
                        : 'border-base-300 bg-base-100 hover:border-primary/50 hover:bg-base-200'
                    }
                  `}
                >
                  <div className="text-left">
                    <div className="font-semibold text-xs">{preset.name}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">
                      {preset.description}
                    </div>
                  </div>
                </button>
              ))}
              <button
                type="button"
                onClick={() => handlePresetChange('Custom')}
                className={`
                  px-3 py-2.5 rounded-lg border-2 transition-all duration-200
                  ${
                    selectedPreset === 'Custom'
                      ? 'border-primary bg-primary/10 text-primary font-semibold shadow-md'
                      : 'border-base-300 bg-base-100 hover:border-primary/50 hover:bg-base-200'
                  }
                `}
              >
                Custom
              </button>
            </div>

            {/* Custom Size Inputs or Display Current Size */}
            {isCustomSize ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-base-content/70">
                    Width (px)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="10000"
                    className="w-full px-3 py-2 rounded-lg border border-base-300 bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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
                  <label className="block text-xs font-medium mb-1.5 text-base-content/70">
                    Height (px)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="10000"
                    className="w-full px-3 py-2 rounded-lg border border-base-300 bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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
              <div className="bg-gradient-to-br from-base-200 to-base-300 rounded-xl p-4 text-center border border-base-300">
                <span className="text-base font-mono font-semibold text-base-content">
                  {formData.canvas_width} × {formData.canvas_height} px
                </span>
              </div>
            )}
          </div>

          {/* Info Note */}
          <div className="bg-info/10 border border-info/30 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-5 h-5 mt-0.5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span className="text-sm text-base-content">
                New galleries are automatically saved as <strong className="text-info">Draft</strong>. You can change the status later from your gallery settings.
              </span>
            </div>
          </div>
        </form>
        </div>

        {/* Modal Actions - Fixed at bottom */}
        <div className="px-6 py-4 bg-base-200 border-t border-base-300 flex justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-lg border border-base-300 bg-base-100 hover:bg-base-200 transition-colors font-medium"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="gallery-form"
            className="px-4 py-2 rounded-lg bg-primary text-primary-content hover:bg-primary/90 transition-colors font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
      </div>
      <div className="modal-backdrop" onClick={handleClose} />
    </div>
  );
}
