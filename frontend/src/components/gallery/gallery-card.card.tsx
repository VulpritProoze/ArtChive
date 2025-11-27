import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Trash2, Calendar, Save, X, Upload, Eye, Edit } from 'lucide-react';
import { toast } from '@utils/toast.util';
import { galleryService, type Gallery } from '@services/gallery.service';
import { handleApiError, formatErrorForToast } from '@utils';

interface GalleryCardProps {
  gallery: Gallery;
  onUpdate: () => void;
  onDelete: (galleryId: string, title: string) => void;
}

export const GalleryCard = ({ gallery, onUpdate, onDelete }: GalleryCardProps) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const [editedTitle, setEditedTitle] = useState(gallery.title);
  const [editedDescription, setEditedDescription] = useState(gallery.description);
  const [newPicture, setNewPicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Invalid file type', 'Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File too large', 'Image size must be less than 5MB');
        return;
      }
      setNewPicture(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!editedTitle.trim()) {
      toast.error('Validation error', 'Title is required');
      return;
    }

    try {
      setIsSaving(true);
      const updateData: any = {
        title: editedTitle,
        description: editedDescription,
      };

      if (newPicture) {
        updateData.picture = newPicture;
      }

      await galleryService.updateGallery(gallery.gallery_id, updateData);
      toast.success('Gallery updated', 'Gallery updated successfully');
      setIsEditing(false);
      setNewPicture(null);
      setPreviewUrl(null);
      onUpdate();
    } catch (error) {
      console.error('Failed to update gallery:', error);
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to update gallery', formatErrorForToast(message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedTitle(gallery.title);
    setEditedDescription(gallery.description);
    setNewPicture(null);
    setPreviewUrl(null);
  };

  const handleStatusChange = async (newStatus: 'draft' | 'active' | 'archived') => {
    if (newStatus === gallery.status) {
      setShowStatusDropdown(false);
      return;
    }

    try {
      setIsChangingStatus(true);
      await galleryService.updateGalleryStatus(gallery.gallery_id, newStatus);
      toast.success('Status updated', `Gallery status changed to ${newStatus}`);
      setShowStatusDropdown(false);
      onUpdate();
    } catch (error) {
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to update status', formatErrorForToast(message));
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('.dropdown') ||
      isEditing
    ) {
      return;
    }
    navigate(`/gallery/${gallery.gallery_id}/editor`);
  };

  // Calculate dropdown position when opening (relative to card)
  useEffect(() => {
    if (showStatusDropdown && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const cardElement = buttonRef.current.closest('.card');
      if (cardElement) {
        const cardRect = cardElement.getBoundingClientRect();
        setDropdownPosition({
          top: buttonRect.bottom - cardRect.top + 8,
          right: cardRect.right - buttonRect.right,
        });
      }
    }
  }, [showStatusDropdown]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowStatusDropdown(false);
      }
    };

    if (showStatusDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showStatusDropdown]);

  return (
    <div
      className="card bg-base-200 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-visible group cursor-pointer relative"
      onClick={handleCardClick}
    >
      {/* Gallery Thumbnail */}
      <figure className="relative h-56 bg-base-300 overflow-hidden">
        <img
          src={previewUrl || gallery.picture}
          alt={gallery.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {isEditing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="btn btn-sm btn-primary gap-2"
            >
              <Upload className="w-4 h-4" />
              Change Picture
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>
        )}
        {/* Gear Icon Button */}
        {!isEditing && (
          <div
            className={`absolute top-2 right-2 transition-opacity ${
              showStatusDropdown ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              ref={buttonRef}
              className="btn btn-sm btn-circle btn-ghost bg-base-100/90 hover:bg-base-100"
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              title="Gallery Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        )}
      </figure>

      {/* Dropdown Menu - Anchored to card with absolute positioning */}
      {showStatusDropdown && !isEditing && (
        <div
          ref={dropdownRef}
          className="absolute bg-base-100 rounded-box shadow-lg border border-base-300 z-40 w-32"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <ul className="menu p-2">
            <li>
              <button
                className="text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStatusDropdown(false);
                  setIsEditing(true);
                }}
              >
                <Edit className="w-4 h-4" />
                Edit Info
              </button>
            </li>
            <div className="divider my-1"></div>
            <li className="menu-title text-xs flex items-center gap-2">
              Change Status
              {isChangingStatus && (
                <span className="loading loading-spinner loading-xs"></span>
              )}
            </li>
            <li>
              <button
                className={`text-sm ${gallery.status === 'draft' ? 'active' : ''} ${
                  isChangingStatus || gallery.status === 'draft'
                    ? 'text-base-content/40 cursor-not-allowed'
                    : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isChangingStatus || gallery.status === 'draft') return;
                  handleStatusChange('draft');
                }}
              >
                Draft
              </button>
            </li>
            <li>
              <button
                className={`text-sm ${gallery.status === 'active' ? 'active' : ''} ${
                  isChangingStatus || gallery.status === 'active'
                    ? 'text-base-content/40 cursor-not-allowed'
                    : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isChangingStatus || gallery.status === 'active') return;
                  handleStatusChange('active');
                }}
              >
                Active
              </button>
            </li>
            <li>
              <button
                className={`text-sm ${gallery.status === 'archived' ? 'active' : ''} ${
                  isChangingStatus || gallery.status === 'archived'
                    ? 'text-base-content/40 cursor-not-allowed'
                    : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isChangingStatus || gallery.status === 'archived') return;
                  handleStatusChange('archived');
                }}
              >
                Archived
              </button>
            </li>
            <div className="divider my-1"></div>
            <li>
              <button
                className="text-sm text-error"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStatusDropdown(false);
                  onDelete(gallery.gallery_id, gallery.title);
                }}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </li>
          </ul>
        </div>
      )}

      <div className="card-body p-5">
        {/* Title and Status */}
        {isEditing ? (
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            className="input input-bordered input-sm w-full font-bold text-lg"
            placeholder="Gallery title"
          />
        ) : (
          <div className="flex items-start justify-between gap-2">
            <h2 className="card-title text-xl flex-1 line-clamp-1">{gallery.title}</h2>
            <div className="badge badge-secondary badge-sm">{gallery.status}</div>
          </div>
        )}

        {/* Description */}
        {isEditing ? (
          <textarea
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            className="textarea textarea-bordered textarea-sm w-full h-20 text-sm resize-none"
            placeholder="Gallery description"
          />
        ) : (
          <p className="text-sm text-base-content/70 line-clamp-2 min-h-[2.5rem]">
            {gallery.description || 'No description'}
          </p>
        )}

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-xs text-base-content/60 mt-2 border-t border-base-300 pt-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(gallery.created_at)}</span>
          </div>
          {gallery.canvas_json && (
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              <span>{gallery.canvas_json.objects.length} objects</span>
            </div>
          )}
          <div className="ml-auto text-base-content/50">
            {gallery.canvas_width} × {gallery.canvas_height}
          </div>
        </div>

        {/* Actions */}
        {isEditing && (
          <div className="card-actions justify-end mt-4 pt-3 border-t border-base-300">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }}
              className="btn btn-sm btn-ghost gap-1.5"
              disabled={isSaving}
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
              className="btn btn-sm btn-primary gap-1.5"
              disabled={isSaving}
            >
              {isSaving ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
