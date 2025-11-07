import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Plus, Edit, Trash2, Calendar, Eye } from 'lucide-react';
import { MainLayout } from '../common/layout';
import { galleryService, type Gallery } from '@services/gallery.service';

const MyGalleries = () => {
  const navigate = useNavigate();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGallery, setNewGallery] = useState({
    title: '',
    description: '',
    status: 'draft',
  });

  // Load galleries on mount
  useEffect(() => {
    console.log('[GalleryIndex] Component mounted, calling loadGalleries()');
    loadGalleries();
  }, []);

  const loadGalleries = async () => {
    console.log('[GalleryIndex] loadGalleries() called');
    console.log('[GalleryIndex] Setting isLoading to true');

    try {
      setIsLoading(true);
      console.log('[GalleryIndex] Calling galleryService.listGalleries()');

      const data = await galleryService.listGalleries();

      console.log('[GalleryIndex] Received galleries:', {
        count: data.length,
        galleries: data,
      });

      setGalleries(data);
      console.log('[GalleryIndex] Galleries state updated');
    } catch (error) {
      console.error('[GalleryIndex] Failed to load galleries:', error);
      toast.error('Failed to load galleries');
    } finally {
      console.log('[GalleryIndex] Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const handleCreateGallery = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newGallery.title.trim()) {
      toast.error('Please enter a gallery title');
      return;
    }

    try {
      const created = await galleryService.createGallery({
        title: newGallery.title,
        description: newGallery.description,
        status: newGallery.status,
      });

      toast.success('Gallery created successfully!');
      setShowCreateModal(false);
      setNewGallery({ title: '', description: '', status: 'draft' });

      // Navigate to the editor for the new gallery
      navigate(`/gallery/${created.gallery_id}/editor`);
    } catch (error) {
      console.error('Failed to create gallery:', error);
      toast.error('Failed to create gallery');
    }
  };

  const handleDeleteGallery = async (galleryId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      await galleryService.deleteGallery(galleryId);
      toast.success('Gallery deleted successfully');
      loadGalleries(); // Reload the list
    } catch (error) {
      console.error('Failed to delete gallery:', error);
      toast.error('Failed to delete gallery');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Log render state
  console.log('[GalleryIndex] Rendering with state:', {
    isLoading,
    galleriesCount: galleries.length,
    galleries,
  });

  return (
    <MainLayout showRightSidebar={false}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Galleries</h1>
            <p className="text-base-content/70 mt-2">
              Create and manage your virtual art galleries
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Gallery
          </button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : galleries.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-4">🎨</div>
              <h2 className="text-2xl font-bold mb-2">No galleries yet</h2>
              <p className="text-base-content/70 mb-6">
                Create your first virtual gallery to showcase your artwork
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Your First Gallery
              </button>
            </div>
          </div>
        ) : (
          /* Gallery Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleries.map((gallery) => (
              <div
                key={gallery.gallery_id}
                className="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow"
              >
                {/* Gallery Thumbnail */}
                <figure className="h-48 bg-base-300">
                  <img
                    src={gallery.picture}
                    alt={gallery.title}
                    className="w-full h-full object-cover"
                  />
                </figure>

                <div className="card-body">
                  {/* Title */}
                  <h2 className="card-title">
                    {gallery.title}
                    <div className="badge badge-secondary">{gallery.status}</div>
                  </h2>

                  {/* Description */}
                  <p className="text-sm text-base-content/70 line-clamp-2">
                    {gallery.description || 'No description'}
                  </p>

                  {/* Meta Info */}
                  <div className="flex items-center gap-2 text-xs text-base-content/60 mt-2">
                    <Calendar className="w-3 h-3" />
                    <span>Created {formatDate(gallery.created_at)}</span>
                  </div>

                  {/* Canvas Info */}
                  {gallery.canvas_json && (
                    <div className="text-xs text-base-content/60">
                      {gallery.canvas_json.objects.length} objects
                    </div>
                  )}

                  {/* Actions */}
                  <div className="card-actions justify-end mt-4">
                    <Link
                      to={`/gallery/${gallery.gallery_id}/editor`}
                      className="btn btn-sm btn-primary gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Link>
                    <button
                      onClick={() =>
                        handleDeleteGallery(gallery.gallery_id, gallery.title)
                      }
                      className="btn btn-sm btn-ghost btn-error gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Gallery Modal */}
        {showCreateModal && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">Create New Gallery</h3>

              <form onSubmit={handleCreateGallery}>
                {/* Title */}
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text">Gallery Title *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Summer Exhibition 2024"
                    className="input input-bordered w-full"
                    value={newGallery.title}
                    onChange={(e) =>
                      setNewGallery({ ...newGallery, title: e.target.value })
                    }
                    required
                  />
                </div>

                {/* Description */}
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text">Description</span>
                  </label>
                  <textarea
                    placeholder="Describe your gallery..."
                    className="textarea textarea-bordered h-24"
                    value={newGallery.description}
                    onChange={(e) =>
                      setNewGallery({
                        ...newGallery,
                        description: e.target.value,
                      })
                    }
                  />
                </div>

                {/* Status */}
                <div className="form-control mb-6">
                  <label className="label">
                    <span className="label-text">Status</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={newGallery.status}
                    onChange={(e) =>
                      setNewGallery({ ...newGallery, status: e.target.value })
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                {/* Modal Actions */}
                <div className="modal-action">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewGallery({
                        title: '',
                        description: '',
                        status: 'draft',
                      });
                    }}
                    className="btn"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create & Edit
                  </button>
                </div>
              </form>
            </div>
            <div
              className="modal-backdrop"
              onClick={() => setShowCreateModal(false)}
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default MyGalleries;
