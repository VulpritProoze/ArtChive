import { useState, useEffect } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import type { Gallery } from '@services/gallery.service';

interface PublishGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  galleries: Gallery[];
  onPublish: (galleryId: string) => Promise<void>;
}

export function PublishGalleryModal({
  isOpen,
  onClose,
  galleries,
  onPublish,
}: PublishGalleryModalProps) {
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // Check if there's an active gallery
  const hasActiveGallery = galleries.some((g) => g.status === 'active');

  // Reset selection when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedGalleryId(null);
      setIsPublishing(false);
    }
  }, [isOpen]);

  const handlePublish = async () => {
    if (!selectedGalleryId || hasActiveGallery) return;

    try {
      setIsPublishing(true);
      await onPublish(selectedGalleryId);
      // onPublish will handle closing the modal and showing success message
    } catch (error) {
      console.error('Failed to publish gallery:', error);
      // Error handling is done in parent component
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClose = () => {
    if (!isPublishing) {
      setSelectedGalleryId(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          bgColor: 'bg-primary/10',
          textColor: 'text-primary',
          borderColor: 'border-primary/30',
          dotColor: 'bg-primary',
        };
      case 'draft':
        return {
          bgColor: 'bg-base-content/10',
          textColor: 'text-base-content/70',
          borderColor: 'border-base-content/20',
          dotColor: 'bg-base-content/40',
        };
      case 'archived':
        return {
          bgColor: 'bg-base-300',
          textColor: 'text-base-content/50',
          borderColor: 'border-base-300',
          dotColor: 'bg-base-content/30',
        };
      default:
        return {
          bgColor: 'bg-base-content/10',
          textColor: 'text-base-content/70',
          borderColor: 'border-base-content/20',
          dotColor: 'bg-base-content/40',
        };
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-secondary text-primary-content px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-2xl">Publish Gallery</h3>
              <p className="text-sm opacity-90 mt-1">Select a gallery to make it publicly visible</p>
            </div>
            <button
              onClick={handleClose}
              className="btn btn-sm btn-circle btn-ghost hover:bg-primary-content/20"
              disabled={isPublishing}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">

        {/* Active Gallery Warning */}
        {hasActiveGallery && (
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-base-content mb-1">Active Gallery Detected</h4>
                <p className="text-sm text-base-content/70">
                  You already have an active gallery. Archive it first to publish another.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Gallery List */}
        <div>
          {galleries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-base-content/60">No galleries available to publish.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {galleries.map((gallery) => {
                const isActive = gallery.status === 'active';
                const isSelected = selectedGalleryId === gallery.gallery_id;
                const isDisabled = hasActiveGallery;
                const statusConfig = getStatusConfig(gallery.status);

                return (
                  <div
                    key={gallery.gallery_id}
                    onClick={() => {
                      if (!isDisabled && !isActive) {
                        setSelectedGalleryId(gallery.gallery_id);
                      }
                    }}
                    className={`
                      border-2 rounded-xl p-4 cursor-pointer transition-all duration-200
                      ${
                        isDisabled
                          ? 'border-base-300 bg-base-200 opacity-60 cursor-not-allowed'
                          : isActive
                          ? 'border-warning/50 bg-warning/5'
                          : isSelected
                          ? 'border-primary bg-primary/10 shadow-md'
                          : 'border-base-300 hover:border-primary/50 hover:bg-base-200/50'
                      }
                    `}
                  >
                    <div className="flex items-start gap-4">
                      {/* Selection Indicator */}
                      <div className="mt-1">
                        {isActive ? (
                          <div className="w-5 h-5 rounded-full bg-warning border-2 border-warning flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-warning-content"></div>
                          </div>
                        ) : isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-primary border-2 border-primary flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-primary-content"></div>
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-base-content/30"></div>
                        )}
                      </div>

                      {/* Gallery Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h4 className="font-semibold text-lg text-base-content">{gallery.title}</h4>
                          {(() => {
                            const config = statusConfig;
                            return (
                              <div
                                className={`
                                  inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                                  border ${config.borderColor}
                                  ${config.bgColor}
                                `}
                              >
                                <div
                                  className={`w-1 h-1 rounded-full ${config.dotColor} ${
                                    gallery.status === 'active' ? 'animate-pulse' : ''
                                  }`}
                                />
                                <span className={`text-xs font-semibold uppercase tracking-wide ${config.textColor}`}>
                                  {gallery.status === 'active' ? 'Published' : gallery.status === 'draft' ? 'Draft' : 'Archived'}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                        {gallery.description && (
                          <p className="text-sm text-base-content/70 line-clamp-2 mb-2">
                            {gallery.description}
                          </p>
                        )}
                        <div className="text-xs text-base-content/50">
                          Created: {new Date(gallery.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-base-200 border-t border-base-300 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg border border-base-300 bg-base-100 hover:bg-base-200 transition-colors font-medium"
            disabled={isPublishing}
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            className="px-4 py-2 rounded-lg bg-primary text-primary-content hover:bg-primary/90 transition-colors font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={isPublishing || hasActiveGallery || !selectedGalleryId}
          >
            {isPublishing ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Publishing...
              </>
            ) : (
              'Publish'
            )}
          </button>
        </div>
      </div>
      {/* Modal backdrop */}
      <div className="modal-backdrop" onClick={handleClose}></div>
    </div>
  );
}

