import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Plus } from 'lucide-react';
import { MainLayout } from '../common/layout';
import { galleryService, type Gallery } from '@services/gallery.service';
import { LoadingSpinner } from '../loading-spinner';
import { GalleryCreationModal, type GalleryFormData } from './GalleryCreationModal';
import { GalleryCard } from './GalleryCard';

const MyGalleries = () => {
  const navigate = useNavigate();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const handleCreateGallery = async (formData: GalleryFormData) => {
    try {
      const created = await galleryService.createGallery({
        title: formData.title,
        description: formData.description,
        status: formData.status,
        picture: formData.picture,
        canvas_width: formData.canvas_width,
        canvas_height: formData.canvas_height,
      });

      toast.success('Gallery created successfully!');
      setShowCreateModal(false);

      // Navigate to the editor for the new gallery
      navigate(`/gallery/${created.gallery_id}/editor`);
    } catch (error) {
      console.error('Failed to create gallery:', error);
      toast.error('Failed to create gallery');
      throw error; // Re-throw so modal can handle it
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
          <LoadingSpinner text={"Loading created galleries..."} />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {galleries.map((gallery) => (
              <GalleryCard
                key={gallery.gallery_id}
                gallery={gallery}
                onUpdate={loadGalleries}
                onDelete={handleDeleteGallery}
              />
            ))}
          </div>
        )}

        {/* Create Gallery Modal */}
        <GalleryCreationModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateGallery}
        />
      </div>
    </MainLayout>
  );
};

export default MyGalleries;
