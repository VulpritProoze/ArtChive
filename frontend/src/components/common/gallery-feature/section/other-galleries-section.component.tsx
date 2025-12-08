import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ArrowDown, ArrowUpDown, Search, X, SearchX } from 'lucide-react';
import type { GalleryListItem } from '@types';
import { SkeletonGalleryGridCard } from '@components/common/skeleton';
import { formatNumber } from '@utils/format-number.util';
import { GalleryCardMenu } from '@components/common/gallery-feature/cards/gallery-card-menu.component';
import TrophyListModal from '@components/common/posts-feature/modal/trophy-list.modal';
import { optimizeGalleryPicture, optimizeProfilePicture } from '@utils/cloudinary-transform.util';

interface OtherGalleriesSectionProps {
  galleries: GalleryListItem[];
  loading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  awards: Record<string, Record<string, number>>;
  animationIndex: number;
  observerTarget: React.RefObject<HTMLDivElement | null>;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export const OtherGalleriesSection = ({
  galleries,
  loading,
  isFetchingNextPage,
  hasNextPage: _hasNextPage,
  fetchNextPage: _fetchNextPage,
  awards,
  animationIndex,
  observerTarget,
  searchQuery: externalSearchQuery,
  onSearchChange,
}: OtherGalleriesSectionProps) => {
  const [hoveredGalleryId, setHoveredGalleryId] = useState<string | null>(null);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
  const [localSearchQuery, setLocalSearchQuery] = useState(externalSearchQuery || '');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(externalSearchQuery || '');

  // Use external search query if provided, otherwise use local
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : debouncedSearchQuery;

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(localSearchQuery);
      if (onSearchChange) {
        onSearchChange(localSearchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearchQuery, onSearchChange]);

  // Sync with external search query if it changes
  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setLocalSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

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

  const GalleryGridCard = ({ gallery }: { gallery: GalleryListItem }) => {
    const imageSrc = optimizeGalleryPicture(gallery.picture) || '/landing-page/artworks/artwork1.avif';
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
            {hasAwards && (
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
            )}
          </div>

          {/* Details overlay with blurred background - positioned over image */}
          <div 
            className="absolute bottom-0 left-0 right-0 transition-all duration-300 backdrop-blur-md text-white"
            style={{
              maxHeight: isHovered ? '50%' : 'auto',
              backgroundColor: 'color-mix(in srgb, var(--local-primary, var(--color-primary)) 40%, transparent)',
            }}
          >
            <div className={`p-2 lg:p-3 flex flex-col transition-all duration-300`}>
              {/* Title - always visible */}
              <h3 className="font-bold text-xs mb-1 truncate text-white">{gallery.title}</h3>
              
              {/* Description - always visible, truncated to one line */}
              {gallery.description && (
                <p className="text-[10px] opacity-80 mb-1 truncate text-white">
                  {gallery.description}
                </p>
              )}
              
              {/* Additional details - only visible on hover */}
              {isHovered && (
                <>
                  <p className="text-[10px] opacity-90 mb-2 line-clamp-2 flex-1 overflow-hidden text-white">{gallery.description || 'No description'}</p>
                  
                  {/* Creator Info */}
                  {creator && (
                    <div className="flex items-center gap-2 mb-2">
                      {creator.profile_picture ? (
                        <img
                          src={optimizeProfilePicture(creator.profile_picture)}
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

  return (
    <>
      <section className="mb-12">
        {/* Purple Banner with Search */}
        <div className={`bg-gradient-to-r from-[var(--local-primary,var(--color-primary))] via-[var(--local-primary,var(--color-primary))]/90 to-[var(--local-primary,var(--color-primary))] text-primary-content py-3 px-4 lg:px-6 mb-4 rounded-t-xl shadow-md section-header-animated animation-${animationIndex}`}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl lg:text-2xl font-bold">Browse Other Galleries</h2>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-content/70" />
              <input
                type="text"
                placeholder="Search galleries..."
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-primary-content/20 text-primary-content placeholder-primary-content/60 rounded-lg border border-primary-content/30 focus:outline-none focus:ring-2 focus:ring-primary-content/50 focus:border-primary-content/50"
              />
              {localSearchQuery && (
                <button
                  onClick={() => {
                    setLocalSearchQuery('');
                    if (onSearchChange) {
                      onSearchChange('');
                    }
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-content/70 hover:text-primary-content transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        {loading && galleries.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 lg:px-8">
            <SkeletonGalleryGridCard count={6} />
          </div>
        ) : searchQuery && galleries.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <SearchX className="w-16 h-16 text-base-content/40 mb-4" />
            <p className="text-lg font-semibold text-base-content/70 mb-2">
              No galleries found
            </p>
            <p className="text-sm text-base-content/50 text-center max-w-md">
              No galleries match your search for &quot;{searchQuery}&quot;. Try a different search term.
            </p>
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
    </>
  );
};

