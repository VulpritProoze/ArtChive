import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Plus, Upload, Eye, MoreVertical, Sparkles, ArrowLeft } from 'lucide-react';
import { MainLayout } from '../common/layout';
import { useAuth } from '@context/auth-context';
import { galleryService, type Gallery } from '@services/gallery.service';
import { GalleryCreationModal, type GalleryFormData } from './gallery-creation.modal';
import { GalleryCard } from './gallery-card.card';
import { PublishGalleryModal } from './publish-gallery.modal';
import { SkeletonCard } from '../common/skeleton';

const MyGalleries = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Check if user has active galleries
  const hasActiveGallery = galleries.some((g) => g.status === 'active');
  const activeGallery = galleries.find((g) => g.status === 'active');
  const draftCount = galleries.filter((g) => g.status === 'draft').length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowActionsDropdown(false);
      }
    };

    if (showActionsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionsDropdown]);

  const handleViewPublishedGallery = () => {
    setShowActionsDropdown(false);
    if (user?.id) {
      navigate(`/gallery/${user.id}`);
    } else {
      toast.error('Unable to view gallery. Please try again.');
    }
  };

  const handlePublish = async (galleryId: string) => {
    try {
      await galleryService.updateGalleryStatus(galleryId, 'active');
      toast.success('Gallery published successfully!');
      setShowPublishModal(false);
      loadGalleries(); // Refresh list
    } catch (error) {
      console.error('Failed to publish gallery:', error);
      toast.error('Failed to publish gallery');
      throw error; // Re-throw so modal can handle it
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
      <div className="container mx-auto px-4 py-6 lg:py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-start gap-4">
              <button
                onClick={() => navigate('/gallery')}
                className="btn btn-ghost btn-circle mt-1"
                title="Back to Gallery"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                  My Galleries
                </h1>
                <p className="text-base-content/70 text-lg">
                  Create and manage your virtual art galleries
                </p>
              </div>
            </div>
            
            {/* Actions Dropdown */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Create Gallery</span>
                <span className="sm:hidden">Create</span>
              </button>
              
              <div className="dropdown dropdown-end" ref={dropdownRef}>
                <button
                  className="btn btn-ghost btn-circle"
                  onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                  aria-label="More actions"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                
                {showActionsDropdown && (
                  <ul className="dropdown-content menu p-2 shadow-xl bg-base-100 rounded-box w-56 border border-base-300 mt-2 z-50">
                    <li className="menu-title">
                      <span>Actions</span>
                    </li>
                    {hasActiveGallery && (
                      <li>
                        <button
                          onClick={handleViewPublishedGallery}
                          className="gap-3"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View Published Gallery</span>
                          {activeGallery && (
                            <span className="badge badge-accent ml-auto">
                              Active
                            </span>
                          )}
                        </button>
                      </li>
                    )}
                    <li>
                      <button
                        onClick={() => {
                          setShowActionsDropdown(false);
                          setShowPublishModal(true);
                        }}
                        disabled={hasActiveGallery}
                        className={hasActiveGallery ? 'opacity-50 cursor-not-allowed' : ''}
                        title={
                          hasActiveGallery
                            ? 'You already have an active gallery. Archive it first to publish another.'
                            : 'Publish a gallery'
                        }
                      >
                        <Upload className="w-4 h-4" />
                        <span>Publish Gallery</span>
                        {hasActiveGallery && (
                          <span className="badge badge-warning ml-auto">
                            Max 1
                          </span>
                        )}
                      </button>
                    </li>
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          {!isLoading && galleries.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="stat bg-base-200 rounded-xl shadow-sm">
                <div className="stat-figure text-primary">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="stat-title">Total Galleries</div>
                <div className="stat-value text-2xl">{galleries.length}</div>
              </div>
              
              <div className="stat bg-base-200 rounded-xl shadow-sm">
                <div className="stat-figure text-accent">
                  <Eye className="w-6 h-6" />
                </div>
                <div className="stat-title">Published</div>
                <div className="stat-value text-2xl">{hasActiveGallery ? 1 : 0}</div>
                <div className="stat-desc">Active gallery</div>
              </div>
              
              <div className="stat bg-base-200 rounded-xl shadow-sm">
                <div className="stat-figure text-secondary">
                  <Plus className="w-6 h-6" />
                </div>
                <div className="stat-title">Drafts</div>
                <div className="stat-value text-2xl">{draftCount}</div>
                <div className="stat-desc">In progress</div>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <SkeletonCard
            count={8}
            containerClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          />
        ) : galleries.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 lg:py-32">
            <div className="max-w-lg mx-auto">
              <div className="relative mb-8">
                <div className="text-8xl mb-4 animate-pulse">🎨</div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full animate-ping opacity-75"></div>
              </div>
              <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                No galleries yet
              </h2>
              <p className="text-base-content/70 mb-8 text-lg leading-relaxed">
                Create your first virtual gallery to showcase your artwork and share your creative vision with the world
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary btn-lg gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <Plus className="w-6 h-6" />
                Create Your First Gallery
              </button>
            </div>
          </div>
        ) : (
          /* Gallery Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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

        {/* Publish Gallery Modal */}
        <PublishGalleryModal
          isOpen={showPublishModal}
          onClose={() => setShowPublishModal(false)}
          galleries={galleries}
          onPublish={handlePublish}
        />
      </div>
    </MainLayout>
  );
};

export default MyGalleries;
