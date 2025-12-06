import { Link, useNavigate } from "react-router-dom";
import { Info, ArrowRight, Images, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { MainLayout } from "../common/layout";
import { useEffect, useRef, useState, useMemo } from "react";
import { useGalleryList, useTopGalleries } from "@hooks/queries/use-gallery";
import type { GalleryListItem } from "@types";
import { SkeletonGalleryGridCard } from "@components/common/skeleton";
import { formatNumber } from "@utils/format-number.util";
import { BestGalleriesCarouselSingle } from "./best-galleries-carousel-single.component";
import { BestGalleriesCarouselMulti } from "./best-galleries-carousel-multi.component";
import { galleryService } from "@services/gallery.service";
import TrophyListModal from "@components/common/posts-feature/modal/trophy-list.modal";
import { GalleryCardMenu } from "./gallery-card-menu.component";

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


const GalleryIndex = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [animationIndex, setAnimationIndex] = useState(0);
  const [awards, setAwards] = useState<Record<string, Record<string, number>>>({});
  const [loadingAwards, setLoadingAwards] = useState(false);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
  const [hoveredGalleryId, setHoveredGalleryId] = useState<string | null>(null);

  // Fetch galleries using React Query for caching
  const {
    data: galleriesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loading,
  } = useGalleryList(5); // 5 items per page

  // Fetch top galleries for "Best Galleries Recently"
  const { data: topGalleriesData, isLoading: isLoadingTopGalleries } = useTopGalleries(25);

  // Check screen size for carousel type
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 500);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Cycle through animations every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationIndex((prev) => (prev + 1) % 3); // Cycle through 0, 1, 2
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Flatten pages into a single array
  const galleries = useMemo(() => {
    return galleriesData?.pages.flatMap((page) => page.results) ?? [];
  }, [galleriesData]);

  // Fetch awards after galleries finish loading
  useEffect(() => {
    if (galleries.length > 0 && !loading && !loadingAwards) {
      setLoadingAwards(true);
      const galleryIds = galleries.map(g => g.gallery_id);
      galleryService.getBulkGalleryAwards(galleryIds)
        .then((awardsData) => {
          setAwards(awardsData);
          setLoadingAwards(false);
        })
        .catch((error) => {
          console.error('Failed to fetch awards:', error);
          setLoadingAwards(false);
        });
    }
  }, [galleries.length, loading]);

  const getAwardEmoji = (awardType: string) => {
    switch (awardType.toLowerCase()) {
      case 'bronze_stroke':
        return '🥉';
      case 'golden_bristle':
        return '🥈';
      case 'diamond_canvas':
        return '🥇';
      default:
        return '🏆';
    }
  };

  const handleAwardClick = (e: React.MouseEvent, galleryId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedGalleryId(galleryId);
    setShowAwardModal(true);
  };

  // Get top galleries list
  const topGalleries = useMemo(() => {
    return topGalleriesData?.results ?? [];
  }, [topGalleriesData]);

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

  // Infinite scrolling behavior
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage &&
          !loading
        ) {
          fetchNextPage();
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
  }, [hasNextPage, isFetchingNextPage, loading, fetchNextPage]);

  const GalleryGridCard = ({ gallery }: { gallery: GalleryListItem }) => {
    const imageSrc = gallery.picture || '/landing-page/artworks/artwork1.avif';
    const creator = gallery.creator_details;
    const artistTypes = creator.artist_types.length > 0 
      ? creator.artist_types.join(', ') 
      : 'Artist';
    const reputation = creator.reputation ?? 0;
    const isPositive = reputation > 0;
    const isNegative = reputation < 0;
    const isHovered = hoveredGalleryId === gallery.gallery_id;
    const galleryAwards = awards[gallery.gallery_id] || {};
    const hasAwards = Object.keys(galleryAwards).length > 0;

    return (
      <div
        className="card bg-base-100 rounded-xl overflow-hidden shadow-lg transition-all duration-300 relative"
        onMouseEnter={() => setHoveredGalleryId(gallery.gallery_id)}
        onMouseLeave={() => setHoveredGalleryId(null)}
      >
        <Link
          to={`/gallery/${gallery.creator_details.id}`}
          className="block w-full h-full relative"
        >
          {/* Full height image */}
          <div className="relative bg-base-300 overflow-hidden w-full" style={{ height: '400px' }}>
            <img
              src={imageSrc}
              alt={gallery.title}
              className="w-full h-full object-cover"
              style={{ width: '100%', height: '100%' }}
              loading="lazy"
              onError={(e) => {
                console.error(`[Gallery Grid Card] Failed to load image: ${imageSrc}`, e);
                (e.target as HTMLImageElement).src = '/landing-page/artworks/artwork1.avif';
              }}
            />
            
            {/* Awards display - top left with blurred background */}
            {hasAwards && !loadingAwards ? (
              <div 
                className="absolute top-2 left-4 backdrop-blur-md bg-black/40 rounded-lg px-1.5 py-1 flex items-center gap-1 cursor-pointer hover:bg-black/50 transition-colors z-20"
                onClick={(e) => handleAwardClick(e, gallery.gallery_id)}
                title="View awards"
              >
                {Object.entries(galleryAwards).map(([awardType, count]) => (
                  <div key={awardType} className="flex items-center gap-0.5" title={`${awardType.replace('_', ' ')} (${count})`}>
                    <span className="text-[10px] leading-none">{getAwardEmoji(awardType)}</span>
                    {count > 1 && (
                      <span className="text-[8px] text-white/90 font-medium leading-none">{count}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : loadingAwards ? (
              <div className="absolute top-2 left-4 backdrop-blur-md bg-black/40 rounded-lg px-1.5 py-1 flex items-center gap-1 z-20">
                <div className="w-3 h-3 skeleton rounded"></div>
              </div>
            ) : null}
          </div>

          {/* Details overlay with blurred background - positioned over image */}
          <div 
            className="absolute bottom-0 left-0 right-0 transition-all duration-300 backdrop-blur-md bg-black/40 text-white"
            style={{
              maxHeight: isHovered ? '50%' : 'auto',
            }}
          >
            <div className={`p-2 lg:p-3 flex flex-col transition-all duration-300`}>
              {/* Title - always visible */}
              <h3 className="font-bold text-xs mb-1 truncate text-white">{gallery.title}</h3>
              
              {/* Additional details - only visible on hover */}
              {isHovered && (
                <>
                  <p className="text-[10px] opacity-90 mb-2 line-clamp-2 flex-1 overflow-hidden text-white">{gallery.description || 'No description'}</p>
                  
                  {/* Creator Info */}
                  {creator && (
                    <div className="flex items-center gap-2 mb-2">
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
                      <div className={`w-6 h-6 rounded-full bg-base-200 flex items-center justify-center flex-shrink-0 ${creator.profile_picture ? 'hidden' : ''}`}>
                        <span className="text-xs font-semibold text-base-content">
                          {creator.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[10px] truncate text-white">
                          {creator.first_name} {creator.middle_name ? creator.middle_name + ' ' : ''}{creator.last_name}
                        </p>
                        <p className="text-[9px] opacity-80 truncate text-white">
                          @{creator.username} • {artistTypes}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Reputation with backdrop blur */}
                  {creator && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded backdrop-blur-sm bg-black/30 w-fit">
                      {isPositive ? (
                        <ArrowUp className="w-3 h-3 text-success flex-shrink-0" />
                      ) : isNegative ? (
                        <ArrowDown className="w-3 h-3 text-error flex-shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-white/70 flex-shrink-0" />
                      )}
                      <span className={`text-[10px] font-medium ${
                        isPositive
                          ? 'text-success'
                          : isNegative
                          ? 'text-error'
                          : 'text-white/70'
                      }`}>
                        {formatNumber(reputation)} Rep
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </Link>

        {/* Menu Button - Show on hover */}
        {isHovered && (
          <GalleryCardMenu username={creator?.username || ''} />
        )}
      </div>
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
      <div className={`bg-gradient-to-r from-[var(--local-primary,var(--color-primary))] via-[var(--local-primary,var(--color-primary))]/90 to-[var(--local-primary,var(--color-primary))] text-primary-content py-3 px-4 lg:px-6 mb-4 rounded-t-xl shadow-md section-header-animated animation-${animationIndex}`}>
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

        {/* Best Galleries Recently Section - Carousel */}
        {isSmallScreen ? (
          <BestGalleriesCarouselSingle 
            galleries={topGalleries}
            isLoading={isLoadingTopGalleries}
          />
        ) : (
          <BestGalleriesCarouselMulti 
            galleries={topGalleries}
            isLoading={isLoadingTopGalleries}
          />
        )}

        {/* Browse Other Galleries Section */}
        <section className="mb-12">
          {/* Purple Banner */}
          <div className={`bg-gradient-to-r from-[var(--local-primary,var(--color-primary))] via-[var(--local-primary,var(--color-primary))]/90 to-[var(--local-primary,var(--color-primary))] text-primary-content py-3 px-4 lg:px-6 mb-4 rounded-t-xl shadow-md section-header-animated animation-${animationIndex}`}>
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
              {isFetchingNextPage && (
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

      {/* Trophy List Modal */}
      {showAwardModal && selectedGalleryId && (
        <TrophyListModal
          isOpen={showAwardModal}
          onClose={() => {
            setShowAwardModal(false);
            setSelectedGalleryId(null);
          }}
          galleryId={selectedGalleryId}
          targetType="gallery"
        />
      )}

      <style>{`
        /* Animation 1: Moving squares pattern */
        @keyframes float-squares {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 0.3;
          }
          25% {
            transform: translateY(-20px) translateX(10px) rotate(90deg);
            opacity: 0.5;
          }
          50% {
            transform: translateY(-10px) translateX(-15px) rotate(180deg);
            opacity: 0.4;
          }
          75% {
            transform: translateY(-25px) translateX(5px) rotate(270deg);
            opacity: 0.6;
          }
          100% {
            transform: translateY(0) translateX(0) rotate(360deg);
            opacity: 0.3;
          }
        }

        /* Animation 2: Floating circles */
        @keyframes float-circles {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0.2;
          }
          33% {
            transform: translateY(-30px) translateX(20px) scale(1.2);
            opacity: 0.4;
          }
          66% {
            transform: translateY(-15px) translateX(-25px) scale(0.8);
            opacity: 0.3;
          }
          100% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0.2;
          }
        }

        /* Animation 3: Wave pattern */
        @keyframes wave-pattern {
          0% {
            transform: translateX(0) translateY(0);
            opacity: 0.3;
          }
          50% {
            transform: translateX(-50px) translateY(-20px);
            opacity: 0.5;
          }
          100% {
            transform: translateX(0) translateY(0);
            opacity: 0.3;
          }
        }

        .section-header-animated {
          position: relative;
          overflow: hidden;
        }

        /* Animation 1: Squares */
        .section-header-animated.animation-0::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background-image: 
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 20px,
              rgba(255, 255, 255, 0.1) 20px,
              rgba(255, 255, 255, 0.1) 40px
            ),
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 20px,
              rgba(255, 255, 255, 0.05) 20px,
              rgba(255, 255, 255, 0.05) 40px
            );
          animation: float-squares 20s linear infinite;
          pointer-events: none;
        }

        /* Animation 2: Circles */
        .section-header-animated.animation-1::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background-image: 
            radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.15) 2px, transparent 2px),
            radial-gradient(circle at 60% 70%, rgba(255, 255, 255, 0.1) 3px, transparent 3px),
            radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.12) 2.5px, transparent 2.5px),
            radial-gradient(circle at 40% 80%, rgba(255, 255, 255, 0.08) 2px, transparent 2px);
          background-size: 60px 60px, 80px 80px, 70px 70px, 90px 90px;
          animation: float-circles 25s ease-in-out infinite;
          pointer-events: none;
        }

        /* Animation 3: Waves */
        .section-header-animated.animation-2::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background-image: 
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 15px,
              rgba(255, 255, 255, 0.08) 15px,
              rgba(255, 255, 255, 0.08) 30px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 15px,
              rgba(255, 255, 255, 0.06) 15px,
              rgba(255, 255, 255, 0.06) 30px
            ),
            repeating-linear-gradient(
              30deg,
              transparent,
              transparent 20px,
              rgba(255, 255, 255, 0.05) 20px,
              rgba(255, 255, 255, 0.05) 40px
            );
          animation: wave-pattern 18s ease-in-out infinite;
          pointer-events: none;
        }

        .section-header-animated > * {
          position: relative;
          z-index: 1;
        }

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
