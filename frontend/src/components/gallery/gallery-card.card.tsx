import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Trash2, Calendar, Save, X, Upload, Eye } from 'lucide-react';
import { toast } from 'react-toastify';
import { galleryService, type Gallery } from '@services/gallery.service';

interface GalleryCardProps {
  gallery: Gallery;
  onUpdate: () => void;
  onDelete: (galleryId: string, title: string) => void;
}

export const GalleryCard = ({ gallery, onUpdate, onDelete }: GalleryCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedTitle, setEditedTitle] = useState(gallery.title);
  const [editedDescription, setEditedDescription] = useState(gallery.description);
  const [newPicture, setNewPicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        toast.error('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
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
      toast.error('Title is required');
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
      toast.success('Gallery updated successfully');
      setIsEditing(false);
      setNewPicture(null);
      setPreviewUrl(null);
      onUpdate();
    } catch (error) {
      console.error('Failed to update gallery:', error);
      toast.error('Failed to update gallery');
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

  return (
    <div className="card bg-base-200 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
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
              onClick={() => fileInputRef.current?.click()}
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
        {!isEditing && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Link
              to={`/gallery/${gallery.gallery_id}/editor`}
              className="btn btn-sm btn-circle btn-primary"
              title="Open Editor"
            >
              <Edit className="w-4 h-4" />
            </Link>
          </div>
        )}
      </figure>

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
        <div className="card-actions justify-end mt-4 pt-3 border-t border-base-300">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="btn btn-sm btn-ghost gap-1.5"
                disabled={isSaving}
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
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
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-sm btn-ghost gap-1.5"
              >
                <Edit className="w-4 h-4" />
                Edit Info
              </button>
              <Link
                to={`/gallery/${gallery.gallery_id}/editor`}
                className="btn btn-sm btn-primary gap-1.5"
              >
                <Edit className="w-4 h-4" />
                Open Editor
              </Link>
              <button
                onClick={() => onDelete(gallery.gallery_id, gallery.title)}
                className="btn btn-sm btn-ghost btn-error gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
