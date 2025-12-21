import { useState } from 'react';
import { X, Calendar, MapPin, Clock, User, Trash2, AlertTriangle, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ExhibitDetail {
  exhibit_id: string;
  gallery: string;
  gallery_title: string;
  gallery_picture: string;
  gallery_creator_username: string;
  organizer_name: string;
  city: string;
  country: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

interface ExhibitDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  exhibit: ExhibitDetail | null;
  isLoading?: boolean;
  onDelete?: (exhibitId: string) => Promise<void>;
  onEdit?: (exhibit: ExhibitDetail) => void;
}

export function ExhibitDetailModal({
  isOpen,
  onClose,
  exhibit,
  isLoading = false,
  onDelete,
  onEdit,
}: ExhibitDetailModalProps) {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getExhibitStatus = () => {
    if (!exhibit) return null;
    const now = new Date();
    const startDate = new Date(exhibit.start_date);
    const endDate = new Date(exhibit.end_date);

    if (startDate > now) {
      return { label: 'Upcoming', className: 'badge-info' };
    } else if (startDate <= now && endDate >= now) {
      return { label: 'Ongoing', className: 'badge-success' };
    } else {
      return { label: 'Past', className: 'badge-ghost' };
    }
  };

  const handleViewGallery = () => {
    if (exhibit?.gallery) {
      navigate(`/gallery/${exhibit.gallery}/editor`);
      onClose();
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!exhibit || !onDelete) return;

    try {
      setIsDeleting(true);
      await onDelete(exhibit.exhibit_id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error('Failed to delete exhibit:', error);
      // Error handling is done in parent component
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleEditClick = () => {
    if (exhibit && onEdit) {
      onEdit(exhibit);
    }
  };

  if (!isOpen) return null;

  const status = getExhibitStatus();

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-3xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-secondary text-primary-content px-6 py-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-2xl">Exhibit Details</h3>
              <p className="text-sm opacity-90 mt-1">View exhibit information</p>
            </div>
            <button
              onClick={onClose}
              className="btn btn-sm btn-circle btn-ghost hover:bg-primary-content/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : !exhibit ? (
            <div className="text-center py-12">
              <p className="text-base-content/60">Exhibit not found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Gallery Info */}
              <div className="bg-base-200 rounded-xl p-4">
                <h4 className="font-semibold text-lg mb-3 text-base-content">Gallery</h4>
                <div className="flex items-center gap-4">
                  <img
                    src={exhibit.gallery_picture}
                    alt={exhibit.gallery_title}
                    className="w-20 h-20 object-cover rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/static/images/default_600x400.png';
                    }}
                  />
                  <div className="flex-1">
                    <h5 className="font-semibold text-base-content">{exhibit.gallery_title}</h5>
                    <p className="text-sm text-base-content/70">by {exhibit.gallery_creator_username}</p>
                    <button
                      onClick={handleViewGallery}
                      className="btn btn-sm btn-ghost mt-2"
                    >
                      View Gallery
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              {status && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-base-content">Status:</span>
                  <div className={`badge ${status.className} badge-lg`}>
                    {status.label}
                  </div>
                </div>
              )}

              {/* Organizer */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-base-content/70">Organizer</label>
                <div className="flex items-center gap-2 p-3 bg-base-200 rounded-lg">
                  <User className="w-5 h-5 text-base-content/60" />
                  <span className="text-base-content">{exhibit.organizer_name}</span>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-base-content/70">Location</label>
                <div className="flex items-center gap-2 p-3 bg-base-200 rounded-lg">
                  <MapPin className="w-5 h-5 text-base-content/60" />
                  <span className="text-base-content">
                    {exhibit.city}, {exhibit.country}
                  </span>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-base-content/70">Start Date</label>
                  <div className="flex items-center gap-2 p-3 bg-base-200 rounded-lg">
                    <Calendar className="w-5 h-5 text-base-content/60" />
                    <div>
                      <div className="text-base-content font-medium">{formatDateShort(exhibit.start_date)}</div>
                      <div className="text-xs text-base-content/60">{formatDate(exhibit.start_date)}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-base-content/70">End Date</label>
                  <div className="flex items-center gap-2 p-3 bg-base-200 rounded-lg">
                    <Calendar className="w-5 h-5 text-base-content/60" />
                    <div>
                      <div className="text-base-content font-medium">{formatDateShort(exhibit.end_date)}</div>
                      <div className="text-xs text-base-content/60">{formatDate(exhibit.end_date)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-base-content/70">Duration</label>
                <div className="flex items-center gap-2 p-3 bg-base-200 rounded-lg">
                  <Clock className="w-5 h-5 text-base-content/60" />
                  <span className="text-base-content">
                    {(() => {
                      const start = new Date(exhibit.start_date);
                      const end = new Date(exhibit.end_date);
                      const diffTime = Math.abs(end.getTime() - start.getTime());
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
                    })()}
                  </span>
                </div>
              </div>

              {/* Metadata */}
              <div className="pt-4 border-t border-base-300">
                <div className="text-xs text-base-content/50 space-y-1">
                  <div>Created: {formatDate(exhibit.created_at)}</div>
                  <div>Last updated: {formatDate(exhibit.updated_at)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-base-200 border-t border-base-300 flex justify-between gap-3 flex-shrink-0">
          <div className="flex gap-3">
            {onEdit && exhibit && (
              <button
                onClick={handleEditClick}
                className="px-4 py-2 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary transition-colors font-medium flex items-center gap-2"
                disabled={isDeleting}
              >
                <Edit className="w-4 h-4" />
                Edit Exhibit
              </button>
            )}
            {onDelete && exhibit && (
              <button
                onClick={handleDeleteClick}
                className="px-4 py-2 rounded-lg border border-error/30 bg-error/10 hover:bg-error/20 text-error transition-colors font-medium flex items-center gap-2"
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4" />
                Delete Exhibit
              </button>
            )}
          </div>
          <div className="flex gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-base-300 bg-base-100 hover:bg-base-200 transition-colors font-medium"
              disabled={isDeleting}
            >
              Close
            </button>
          </div>
        </div>
      </div>
      <div className="modal-backdrop" onClick={showDeleteConfirm ? undefined : onClose} />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal modal-open" style={{ zIndex: 9999 }}>
          <div className="modal-box max-w-md">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-error/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-error" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-base-content mb-2">Delete Exhibit</h3>
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-base-content">
                      <span className="font-semibold text-warning">Warning:</span> This is not a reversible action. Once deleted, this exhibit cannot be recovered.
                    </p>
                  </div>
                </div>
                <p className="text-sm text-base-content/70 mb-4">
                  Are you sure you want to delete this exhibit? This action will permanently remove the exhibit from the system.
                </p>
              </div>
            </div>
            <div className="modal-action">
              <button
                onClick={handleCancelDelete}
                className="btn btn-ghost"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="btn btn-error gap-2"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelDelete} />
        </div>
      )}
    </div>
  );
}

