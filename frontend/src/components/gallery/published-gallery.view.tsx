import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { galleryService, type Gallery } from '@services/gallery.service';
import { GalleryLayout } from '@components/common/layout';
import { LoadingSpinner } from '@components/loading-spinner';
import handleApiError from '@utils/handle-api-error';
import { renderCanvasObjectToHTML } from '@utils/canvas-to-html-renderer';
import GalleryCommentsModal from '@components/common/gallery-feature/modal/gallery-comments-modal.component';
import { TrophySelectionModal } from '@components/common/posts-feature/modal';
import { usePostUI } from '@context/post-ui-context';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComment, faTrophy } from '@fortawesome/free-solid-svg-icons';

export default function PublishedGalleryView() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string[] | null>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    showTrophyModal,
    setShowTrophyModal,
    setSelectedPostForTrophy,
  } = usePostUI();

  const handleOpenAwardModal = () => {
    if (gallery?.gallery_id) {
      setSelectedPostForTrophy(gallery.gallery_id);
      setShowTrophyModal(true);
    }
  };

  useEffect(() => {
    const fetchGallery = async () => {
      if (!userId) {
        setError(['User ID is missing']);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const userIdNumber = parseInt(userId, 10);
        if (isNaN(userIdNumber)) {
          setError(['Invalid user ID']);
          setIsLoading(false);
          return;
        }

        const fetchedGallery = await galleryService.getActiveGalleryByUserId(userIdNumber);
        setGallery(fetchedGallery);
      } catch (err: any) {
        console.error('Error fetching gallery:', err);
        const errorMessages = handleApiError(err, {}, true, true) as string[];
        setError(errorMessages);

        // Handle 404 - no active gallery
        if (err.response?.status === 404) {
          setError(['This user doesn\'t have an active gallery published.']);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchGallery();
  }, [userId]);

  // Calculate container height based on aspect ratio and 100vw width
  useEffect(() => {
    if (!gallery) return;

    const updateContainerHeight = () => {
      const viewportWidth = window.innerWidth;
      const canvasAspectRatio = gallery.canvas_height / gallery.canvas_width;
      const calculatedHeight = viewportWidth * canvasAspectRatio;

      setContainerHeight(calculatedHeight);
    };

    updateContainerHeight();
    window.addEventListener('resize', updateContainerHeight);
    return () => window.removeEventListener('resize', updateContainerHeight);
  }, [gallery]);

  if (isLoading) {
    return (
      <GalleryLayout>
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner text="Loading gallery..." />
        </div>
      </GalleryLayout>
    );
  }

  if (error || !gallery) {
    return (
      <GalleryLayout>
        <div className="flex flex-col justify-center items-center min-h-screen gap-4 px-4">
          <div className="bg-base-200 rounded-xl p-6 max-w-md w-full shadow-lg">
            <h1 className="text-2xl font-bold text-error mb-4">Error Loading Gallery</h1>
            <div className="space-y-2 mb-6">
              {error && Array.isArray(error) ? (
                error.map((msg, index) => (
                  <p key={index} className="text-base-content/70">
                    {msg}
                  </p>
                ))
              ) : (
                <p className="text-base-content/70">
                  {error || 'Gallery not found'}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate(-1)}
                className="btn btn-ghost"
              >
                Go Back
              </button>
              <button
                onClick={() => navigate('/gallery')}
                className="btn btn-primary"
              >
                Go to Gallery
              </button>
            </div>
          </div>
        </div>
      </GalleryLayout>
    );
  }

  // Sort objects by zIndex if present, otherwise maintain array order
  const sortedObjects = [...(gallery.canvas_json?.objects || [])].sort((a, b) => {
    const zIndexA = a.zIndex ?? 0;
    const zIndexB = b.zIndex ?? 0;
    return zIndexA - zIndexB;
  });

  // Calculate scale: viewport width / canvas width
  const scale = window.innerWidth / gallery.canvas_width;

  // Debug logging
  console.log('=== PUBLISHED GALLERY DEBUG ===');
  console.log('Canvas Dimensions:', {
    original: { width: gallery.canvas_width, height: gallery.canvas_height },
    aspectRatio: gallery.canvas_height / gallery.canvas_width,
  });
  console.log('Viewport & Container:', {
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    containerHeight: containerHeight,
    scale: scale,
  });
  console.log('Canvas Background:', gallery.canvas_json?.background || '#ffffff');
  console.log('Total Objects:', sortedObjects.length);
  console.log('Objects to render:', sortedObjects.map(obj => ({ type: obj.type, id: obj.id, x: obj.x, y: obj.y })));
  console.log('=== START RENDERING ===');

  return (
    <GalleryLayout
      sidebarMenuItems={[
        {
          label: "Sidebar",
          icon: faComment,
          action: () => {
            setIsCommentsModalOpen(true);
          },
        },
        {
          label: "Award Gallery",
          icon: faTrophy,
          action: handleOpenAwardModal,
        },
      ]}
    >
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: `${containerHeight}px`,
          minHeight: `${containerHeight}px`,
          backgroundColor: gallery.canvas_json?.background || '#ffffff',
          overflow: 'hidden',
        }}
      >
        {sortedObjects.map((object) => renderCanvasObjectToHTML(object, scale))}
      </div>

      {/* Sticky Sidebar Button */}
      <div className="tooltip tooltip-left fixed bottom-6 right-6 z-40" data-tip="Open Sidebar">
        <button
          onClick={() => setIsCommentsModalOpen(true)}
          className="btn btn-circle btn-primary btn-lg shadow-2xl hover:scale-110 transition-transform"
          aria-label="Open sidebar"
          title="Open Sidebar"
        >
          <FontAwesomeIcon icon={faComment} className="w-6 h-6" />
        </button>
      </div>

      {/* Comments Modal */}
      <GalleryCommentsModal
        isOpen={isCommentsModalOpen}
        onClose={() => setIsCommentsModalOpen(false)}
        galleryId={gallery.gallery_id}
      />

      {/* Trophy Selection Modal */}
      {showTrophyModal && gallery?.gallery_id && (
        <TrophySelectionModal targetType="gallery" targetId={gallery.gallery_id} />
      )}
    </GalleryLayout>
  );
}

