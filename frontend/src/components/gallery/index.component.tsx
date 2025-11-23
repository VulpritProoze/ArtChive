import { Link, useNavigate } from "react-router-dom";
import { Info, ArrowRight, Images } from "lucide-react";
import { MainLayout } from "../common/layout";
import { useEffect, useRef, useState, useCallback } from "react";
import { galleryService } from "@services/gallery.service";
import type { GalleryListItem } from "@types";
import { SkeletonGalleryGridCard } from "@components/common/skeleton";

interface GalleryCard {
  id: string;
  title: string;
  imageUrl?: string;
  artistName?: string;
  artistHandle?: string;
  artistType?: string;
  artistAvatar?: string;
  likes?: number;
  comments?: number;
}

// Available artwork images - using actual files from the folder
const artworkImages = [
  'artwork1.avif',
  'artwork2.avif',
  'artwork3.avif',
  'artwork4.avif',
  'artwork5.jpg',
  'artwork6.jpg',
  'artwork7.avif',
  'artwork8.jpg',
  'artwork9.jpg',
  'artwork10.jpg',
  'artwork11.jpg',
  'artwork12.jpg',
  'aw13.avif',
  'aw14.jpg',
  'aw15.jpg',
];

// Placeholder data - will be replaced with API calls later
const fellowsGalleries: GalleryCard[] = Array.from({ length: 10 }, (_, i) => ({
  id: `fellow-${i}`,
  title: `Gallery ${i + 1}`,
  imageUrl: `/landing-page/artworks/${artworkImages[i % artworkImages.length]}`,
}));

const bestGalleries: GalleryCard[] = Array.from({ length: 8 }, (_, i) => ({
  id: `best-${i}`,
  title: `Featured Gallery ${i + 1}`,
  imageUrl: `/landing-page/artworks/${artworkImages[(i + 2) % artworkImages.length]}`,
}));

const GalleryIndex = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // State for "Browse Other Galleries" section
  const [galleries, setGalleries] = useState<GalleryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    hasNext: false,
    hasPrevious: false,
    totalCount: 0,
  });

  // Scroll-based color shift effect (local to this component only)
  useEffect(() => {
    // Helper function to convert hex to RGB
    const hexToRgb = (hex: string): [number, number, number] | null => {
      hex = hex.replace('#', '');
      if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
      }
      if (hex.length !== 6) return null;
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return [r, g, b];
    };

    // Helper function to interpolate between two hex colors
    const interpolateColor = (color1: string, color2: string, factor: number): string => {
      const rgb1 = hexToRgb(color1);
      const rgb2 = hexToRgb(color2);
      if (!rgb1 || !rgb2) return color1;
      
      const [r1, g1, b1] = rgb1;
      const [r2, g2, b2] = rgb2;
      
      const r = Math.round(r1 + (r2 - r1) * factor);
      const g = Math.round(g1 + (g2 - g1) * factor);
      const b = Math.round(b1 + (b2 - b1) * factor);
      
      return `#${[r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('')}`;
    };

    const handleScroll = () => {
      if (!containerRef.current) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progress = scrollHeight > 0 ? Math.min(scrollTop / scrollHeight, 1) : 0;

      // Get current primary and secondary colors dynamically from CSS variables
      // This ensures it always uses the current theme values
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      
      // Read current values from CSS variables (no hardcoded fallbacks - fully dynamic)
      const originalPrimary = computedStyle.getPropertyValue('--color-primary').trim();
      const secondaryColor = computedStyle.getPropertyValue('--color-secondary').trim();

      // Only interpolate if both colors are available
      if (originalPrimary && secondaryColor) {
        const interpolatedColor = interpolateColor(originalPrimary, secondaryColor, progress);
        containerRef.current.style.setProperty('--local-primary', interpolatedColor);
      } else if (originalPrimary) {
        // Fallback: if secondary is not available, just use primary
        containerRef.current.style.setProperty('--local-primary', originalPrimary);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Skeleton version of HorizontalScrollCard
  const HorizontalScrollSkeletonCard = ({ showAvatar = false }: { showAvatar?: boolean }) => {
    const cardWidth = showAvatar ? 'w-56' : 'w-80';
    const cardHeight = showAvatar ? 'h-48' : 'h-64';

    return (
      <div className={`flex-shrink-0 ${cardWidth} rounded-xl overflow-hidden shadow-lg`}>
        <div className={`relative ${cardHeight} bg-base-300 overflow-hidden`}>
          <div className="w-full h-full skeleton"></div>
          {showAvatar && (
            <div className="absolute bottom-3 left-3">
              <div className="w-10 h-10 rounded-full bg-base-200 border-2 border-base-100 skeleton"></div>
            </div>
          )}
          {!showAvatar && (
            <div className="absolute top-3 right-3">
              <div className="w-8 h-8 rounded-full bg-base-200/50 skeleton"></div>
            </div>
          )}
        </div>
        <div className="bg-base-200 p-2.5">
          <div className="skeleton h-4 w-24 mb-2"></div>
          {showAvatar && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-base-300 skeleton flex-shrink-0"></div>
              <div className="min-w-0 flex-1">
                <div className="skeleton h-3 w-20 mb-1"></div>
                <div className="skeleton h-2 w-32"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const HorizontalScrollCard = ({ gallery, showAvatar = false }: { gallery: GalleryCard; showAvatar?: boolean }) => {
    const cardWidth = showAvatar ? 'w-56' : 'w-80';
    const cardHeight = showAvatar ? 'h-48' : 'h-64';
    const imageSrc = gallery.imageUrl || '/landing-page/artworks/artwork1.avif';

    return (
      <Link
        to={`/gallery/${gallery.id}`}
        className={`flex-shrink-0 ${cardWidth} rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group hover:scale-[1.02]`}
      >
        <div className={`relative ${cardHeight} bg-base-300 overflow-hidden`}>
          <img
            src={imageSrc}
            alt={gallery.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              console.error(`[Gallery Card] Failed to load image: ${imageSrc}`, e);
              (e.target as HTMLImageElement).src = '/landing-page/artworks/artwork1.avif';
            }}
          />
          {showAvatar && (
            <div className="absolute bottom-3 left-3">
              <div className="w-10 h-10 rounded-full bg-base-200 border-2 border-base-100 skeleton"></div>
            </div>
          )}
          {gallery.likes !== undefined && (
            <div className="absolute top-3 right-3 flex gap-2">
              <div className="bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1.5 text-white text-xs">
                <span>❤️</span>
                <span>{gallery.likes}</span>
              </div>
              {gallery.comments !== undefined && (
                <div className="bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1.5 text-white text-xs">
                  <span>💬</span>
                  <span>{gallery.comments}</span>
                </div>
              )}
            </div>
          )}
          {!showAvatar && (
            <div className="absolute top-3 right-3">
              <button className="btn btn-circle btn-sm bg-black/50 backdrop-blur-sm border-0 hover:bg-black/70 text-white">
                <Info className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        <div className="bg-[var(--local-primary,var(--color-primary))] text-primary-content p-2.5">
          <h3 className="font-semibold text-sm truncate">{gallery.title}</h3>
          {gallery.artistName && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-base-200 skeleton flex-shrink-0"></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{gallery.artistName}</p>
                <p className="text-[10px] opacity-80 truncate">{gallery.artistHandle} • {gallery.artistType}</p>
              </div>
            </div>
          )}
        </div>
      </Link>
    );
  };

  // Fetch galleries function
  const fetchGalleries = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const response = await galleryService.listGalleries(page, 5); // 12 items per page for grid

      if (append) {
        setGalleries((prev) => [...prev, ...response.results]);
      } else {
        setGalleries(response.results);
      }

      setPagination({
        currentPage: page,
        hasNext: response.next !== null,
        hasPrevious: response.previous !== null,
        totalCount: response.count,
      });
    } catch (error) {
      console.error('[GalleryIndex] Failed to fetch galleries:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchGalleries(1, false);
  }, [fetchGalleries]);

  // Infinite scrolling behavior
  useEffect(() => {
    let isFetching = false;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          pagination.hasNext &&
          !loadingMore &&
          !loading &&
          !isFetching
        ) {
          isFetching = true;
          fetchGalleries(pagination.currentPage + 1, true).finally(() => {
            isFetching = false;
          });
        }
      },
      { threshold: 0.5 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
      observer.disconnect();
    };
  }, [
    pagination.hasNext,
    loadingMore,
    loading,
    fetchGalleries,
    pagination.currentPage,
  ]);

  const GalleryGridCard = ({ gallery }: { gallery: GalleryListItem }) => {
    const imageSrc = gallery.picture || '/landing-page/artworks/artwork1.avif';
    const creator = gallery.creator_details;
    const artistTypes = creator.artist_types.length > 0 
      ? creator.artist_types.join(', ') 
      : 'Artist';

    return (
      <Link
        to={`/gallery/${gallery.creator_details.id}`}
        className="card bg-base-100 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all group cursor-pointer"
      >
        <div className="relative h-64 bg-base-300 overflow-hidden">
          <img
            src={imageSrc}
            alt={gallery.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              console.error(`[Gallery Grid Card] Failed to load image: ${imageSrc}`, e);
              (e.target as HTMLImageElement).src = '/landing-page/artworks/artwork1.avif';
            }}
          />
        </div>
        <div className="bg-[var(--local-primary,var(--color-primary))] text-primary-content p-3">
          <h3 className="font-semibold text-sm truncate mb-1.5">{gallery.title}</h3>
          <div className="flex items-center gap-2">
            {creator.profile_picture ? (
              <img
                src={creator.profile_picture}
                alt={creator.username}
                className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`w-6 h-6 rounded-full bg-base-200 skeleton flex-shrink-0 ${creator.profile_picture ? 'hidden' : ''}`}></div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">
                {creator.first_name} {creator.middle_name ? creator.middle_name + ' ' : ''}{creator.last_name}
              </p>
              <p className="text-[10px] opacity-80 truncate mb-1">
                @{creator.username} • {artistTypes}
              </p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                <p className="text-[10px] opacity-90">
                  {creator.brush_drips_count.toLocaleString()} Brush Drips
                </p>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  const HorizontalScrollSection = ({
    title,
    galleries,
    showAvatar = false,
    showDropdowns = false,
    useSkeleton = false,
    skeletonCount = 5,
  }: {
    title: string;
    galleries: GalleryCard[];
    showAvatar?: boolean;
    showDropdowns?: boolean;
    useSkeleton?: boolean;
    skeletonCount?: number;
  }) => (
    <section className="mb-12">
      {/* Purple Banner */}
      <div className="bg-gradient-to-r from-[var(--local-primary,var(--color-primary))] to-[var(--local-primary,var(--color-primary))]/90 text-primary-content py-3 px-4 lg:px-6 mb-4 rounded-t-xl shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-xl lg:text-2xl font-bold">{title}</h2>
          {showDropdowns && (
            <div className="flex flex-wrap gap-2">
              <select className="select select-bordered select-sm bg-base-100 text-base-content border-base-300 focus:outline-primary text-xs">
                <option>Sort by most popular</option>
                <option>Sort by newest</option>
                <option>Sort by oldest</option>
              </select>
              <select className="select select-bordered select-sm bg-base-100 text-base-content border-base-300 focus:outline-primary text-xs">
                <option>Today</option>
                <option>This Week</option>
                <option>This Month</option>
                <option>All Time</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Scroll Container */}
      <div className="relative">
        <div
          className="flex gap-6 overflow-x-auto pb-4 px-4 lg:px-6 scroll-smooth gallery-scroll-container"
        >
          {useSkeleton ? (
            Array.from({ length: skeletonCount }, (_, i) => (
              <HorizontalScrollSkeletonCard key={`skeleton-${i}`} showAvatar={showAvatar} />
            ))
          ) : (
            galleries.map((gallery) => (
              <HorizontalScrollCard
                key={gallery.id}
                gallery={gallery}
                showAvatar={showAvatar}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );

  return (
    <MainLayout showRightSidebar={false}>
      <div ref={containerRef} className="container mx-auto px-4 lg:px-8 py-8 gallery-index-container">
        {/* Navigation Button to My Galleries */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => navigate('/gallery/me')}
            className="btn gap-2 text-primary-content hover:gap-3 transition-all duration-200"
            style={{ backgroundColor: 'var(--local-primary, var(--color-primary))' }}
          >
            <Images className="w-4 h-4" />
            <span>My Galleries</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Fellows You Follow Section */}
        <HorizontalScrollSection
          title="Fellows You Follow"
          galleries={fellowsGalleries}
          showAvatar={true}
          useSkeleton={true}
          skeletonCount={5}
        />

        {/* Best Galleries Recently Section */}
        <HorizontalScrollSection
          title="Best Galleries Recently"
          galleries={bestGalleries}
          showDropdowns={true}
          useSkeleton={true}
          skeletonCount={5}
        />

        {/* Browse Other Galleries Section */}
        <section className="mb-12">
          {/* Purple Banner */}
          <div className="bg-gradient-to-r from-[var(--local-primary,var(--color-primary))] to-[var(--local-primary,var(--color-primary))]/90 text-primary-content py-3 px-4 lg:px-6 mb-4 rounded-t-xl shadow-md">
            <h2 className="text-xl lg:text-2xl font-bold">Browse Other Galleries</h2>
          </div>

          {/* Gallery Grid */}
          {loading && galleries.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 lg:px-8">
              <SkeletonGalleryGridCard count={6} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 lg:px-8">
                {galleries.map((gallery) => (
                  <GalleryGridCard key={gallery.gallery_id} gallery={gallery} />
                ))}
              </div>

              {/* Loading more skeleton */}
              {loadingMore && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 lg:px-8 mt-6">
                  <SkeletonGalleryGridCard count={3} />
                </div>
              )}

              {/* Intersection observer target for infinite scroll */}
              <div ref={observerTarget} className="h-10 w-full" />
            </>
          )}
        </section>
      </div>

      <style>{`
        /* Custom scrollbar for gallery sections - Cool design */
        .gallery-scroll-container {
          scrollbar-width: thin;
          scrollbar-color: var(--local-primary, var(--color-primary)) transparent;
        }

        /* Webkit browsers (Chrome, Safari, newer Edge) - Cool scrollbar design */
        .gallery-scroll-container::-webkit-scrollbar {
          height: 12px;
        }

        .gallery-scroll-container::-webkit-scrollbar-track {
          background: linear-gradient(
            90deg,
            transparent 0%,
            var(--color-base-300) 20%,
            var(--color-base-300) 80%,
            transparent 100%
          );
          border-radius: 10px;
          margin: 0 20px;
        }

        .gallery-scroll-container::-webkit-scrollbar-thumb {
          background: linear-gradient(
            90deg,
            var(--local-primary, var(--color-primary)) 0%,
            var(--color-secondary) 50%,
            var(--local-primary, var(--color-primary)) 100%
          );
          border-radius: 10px;
          border: 2px solid var(--color-base-300);
          box-shadow: 
            0 0 10px color-mix(in srgb, var(--local-primary, var(--color-primary)) 30%, transparent),
            inset 0 0 5px rgba(255, 255, 255, 0.2);
          transition: all 0.3s ease;
        }

        .gallery-scroll-container::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(
            90deg,
            var(--color-secondary) 0%,
            var(--local-primary, var(--color-primary)) 50%,
            var(--color-secondary) 100%
          );
          box-shadow: 
            0 0 15px color-mix(in srgb, var(--local-primary, var(--color-primary)) 50%, transparent),
            inset 0 0 8px rgba(255, 255, 255, 0.3);
          transform: scaleY(1.1);
        }

        .gallery-scroll-container::-webkit-scrollbar-thumb:active {
          background: linear-gradient(
            90deg,
            var(--local-primary, var(--color-primary)) 0%,
            var(--color-accent, #a855f7) 50%,
            var(--local-primary, var(--color-primary)) 100%
          );
        }

        /* Firefox scrollbar */
        .gallery-scroll-container {
          scrollbar-width: thin;
          scrollbar-color: var(--local-primary, var(--color-primary)) var(--color-base-300);
        }
      `}</style>
    </MainLayout>
  );
};

export default GalleryIndex;
