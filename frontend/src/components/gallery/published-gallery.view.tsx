import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { galleryService, type Gallery } from '@services/gallery.service';
import { GalleryLayout } from '@components/common/layout';
import { LoadingSpinner } from '@components/loading-spinner';
import handleApiError from '@utils/handle-api-error';
import { renderCanvasObjectToHTML, calculateScale } from '@utils/canvas-to-html-renderer';

export default function PublishedGalleryView() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string[] | null>(null);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Calculate responsive scale to fit viewport
  useEffect(() => {
    if (!gallery || !containerRef.current) return;

    const updateScale = () => {
      const headerHeight = 48; // GalleryLayout header height
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight - headerHeight;
      
      const calculatedScale = calculateScale(
        gallery.canvas_width,
        gallery.canvas_height,
        viewportWidth,
        viewportHeight
      );
      
      setScale(calculatedScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
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

  const scaledWidth = gallery.canvas_width * scale;
  const scaledHeight = gallery.canvas_height * scale;

  return (
    <GalleryLayout>
      <div 
        ref={containerRef}
        className="flex justify-center items-center min-h-screen w-full overflow-auto"
        style={{ 
          minHeight: 'calc(100vh - 48px)',
          backgroundColor: gallery.canvas_json?.background || '#ffffff',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
            backgroundColor: gallery.canvas_json?.background || '#ffffff',
          }}
        >
          {sortedObjects.map((object) => renderCanvasObjectToHTML(object, scale))}
        </div>
      </div>
    </GalleryLayout>
  );
}

