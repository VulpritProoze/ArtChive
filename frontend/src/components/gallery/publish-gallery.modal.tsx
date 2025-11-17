import { useState, useEffect } from 'react';
import { X, CheckCircle2, Circle } from 'lucide-react';
import { galleryService, type Gallery } from '@services/gallery.service';

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
  const activeGallery = galleries.find((g) => g.status === 'active');

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

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-2xl">Publish Gallery</h3>
          <button
            onClick={handleClose}
            className="btn btn-sm btn-circle btn-ghost"
            disabled={isPublishing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Gallery Warning */}
        {hasActiveGallery && (
          <div className="alert alert-warning mb-4">
            <CheckCircle2 className="w-5 h-5" />
            <div>
              <h4 className="font-semibold">Active Gallery Detected</h4>
              <p className="text-sm">
                You already have an active gallery. Archive it first to publish another.
              </p>
            </div>
          </div>
        )}

        {/* Gallery List */}
        <div className="flex-1 overflow-y-auto mb-6">
          {galleries.length === 0 ? (
            <div className="text-center py-8 text-base-content/60">
              <p>No galleries available to publish.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {galleries.map((gallery) => {
                const isActive = gallery.status === 'active';
                const isSelected = selectedGalleryId === gallery.gallery_id;
                const isDisabled = hasActiveGallery;

                return (
                  <div
                    key={gallery.gallery_id}
                    onClick={() => {
                      if (!isDisabled && !isActive) {
                        setSelectedGalleryId(gallery.gallery_id);
                      }
                    }}
                    className={`
                      border rounded-lg p-4 cursor-pointer transition-all
                      ${
                        isDisabled
                          ? 'border-base-300 bg-base-200 opacity-60 cursor-not-allowed'
                          : isActive
                          ? 'border-warning bg-warning/10'
                          : isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-base-300 hover:border-primary/50 hover:bg-base-200'
                      }
                    `}
                  >
                    <div className="flex items-start gap-4">
                      {/* Selection Indicator */}
                      <div className="mt-1">
                        {isActive ? (
                          <CheckCircle2 className="w-5 h-5 text-warning" />
                        ) : isSelected ? (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        ) : (
                          <Circle className="w-5 h-5 text-base-content/30" />
                        )}
                      </div>

                      {/* Gallery Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-lg">{gallery.title}</h4>
                          {isActive && (
                            <span className="badge badge-warning badge-sm">Active</span>
                          )}
                          {gallery.status === 'archived' && (
                            <span className="badge badge-ghost badge-sm">Archived</span>
                          )}
                          {gallery.status === 'draft' && (
                            <span className="badge badge-outline badge-sm">Draft</span>
                          )}
                        </div>
                        {gallery.description && (
                          <p className="text-sm text-base-content/70 line-clamp-2">
                            {gallery.description}
                          </p>
                        )}
                        <div className="text-xs text-base-content/50 mt-2">
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

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-base-300">
          <button
            onClick={handleClose}
            className="btn btn-ghost"
            disabled={isPublishing}
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            className="btn btn-primary"
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

