import { useRef } from 'react';
import { Link } from 'react-router-dom';
import type { GalleryListItem } from '@types';
import { optimizeGalleryPicture, optimizeProfilePicture } from '@utils/cloudinary-transform.util';

interface FellowsGallerySectionProps {
  galleries: GalleryListItem[];
  animationIndex: number;
  isLoading?: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  observerTarget?: React.RefObject<HTMLDivElement>;
}

// Skeleton version of HorizontalScrollCard
const HorizontalScrollSkeletonCard = () => {
  return (
    <div className="flex-shrink-0 w-36 rounded-xl overflow-hidden shadow-lg">
      <div className="relative h-48 bg-base-300 overflow-hidden">
        <div className="w-full h-full skeleton"></div>
        {/* Fading black background overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/90 via-black/70 to-transparent"></div>
        {/* Avatar skeleton */}
        <div className="absolute bottom-2.5 left-2.5 z-20">
          <div className="w-8 h-8 rounded-full bg-base-200 border-2 border-white/20 skeleton shadow-md"></div>
        </div>
        {/* Text skeleton */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-2.5">
          <div className="pr-2" style={{ paddingLeft: '3.5rem' }}>
            <div className="skeleton h-3 w-24 mb-1.5 bg-white/20 rounded"></div>
            <div className="skeleton h-2.5 w-20 bg-white/20 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HorizontalScrollCard = ({ gallery }: { gallery: GalleryListItem }) => {
  const imageSrc = optimizeGalleryPicture(gallery.picture) || '/landing-page/artworks/artwork1.avif';
  const creator = gallery.creator_details;

  return (
    <Link
      to={`/gallery/${gallery.gallery_id}`}
      className="flex-shrink-0 w-36 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group hover:scale-[1.02]"
    >
      <div className="relative h-48 bg-base-300 overflow-hidden">
        {/* Gallery Image */}
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
        
        {/* Fading black background overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/90 via-black/70 to-transparent pointer-events-none"></div>
        
        {/* Content overlay - positioned above gradient */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-2.5">
          {/* Author avatar at bottom left */}
          {creator && (
            <div className="absolute bottom-2.5 left-2.5 z-20">
              {creator.profile_picture ? (
                <img
                  src={optimizeProfilePicture(creator.profile_picture)}
                  alt={creator.username}
                  className="w-8 h-8 rounded-full bg-base-200 border-2 border-white/20 object-cover shadow-md"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-8 h-8 rounded-full bg-base-200 border-2 border-white/20 flex items-center justify-center shadow-md ${creator.profile_picture ? 'hidden' : ''}`}>
                <span className="text-[10px] font-semibold text-base-content">
                  {creator.username.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          )}

          {/* Title and Author Name - positioned to avoid avatar */}
          <div className="pr-1" style={{ paddingLeft: creator ? '2.4rem' : '0' }}>
            <h3 
              className="font-semibold text-xs text-white mb-0.5 leading-tight truncate"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%'
              }}
              title={gallery.title}
            >
              {gallery.title}
            </h3>
            {creator && (
              <p 
                className="text-[10px] text-white/90 leading-tight truncate"
                style={{ maxWidth: '100%' }}
                title={`@${creator?.username}`}
              >
                @{creator?.username}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export const FellowsGallerySection = ({ 
  galleries, 
  animationIndex, 
  isLoading = false,
  isFetchingNextPage = false,
  observerTarget
}: FellowsGallerySectionProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <section className="mb-12">
      {/* Purple Banner */}
      <div className={`bg-gradient-to-r from-[var(--local-primary,var(--color-primary))] via-[var(--local-primary,var(--color-primary))]/90 to-[var(--local-primary,var(--color-primary))] text-primary-content py-3 px-4 lg:px-6 mb-4 rounded-t-xl shadow-md section-header-animated animation-${animationIndex}`}>
        <h2 className="text-xl lg:text-2xl font-bold">Fellows You Follow</h2>
      </div>

      {/* Horizontal Scroll Container with Infinite Scroll */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-4 px-4 lg:px-6 scroll-smooth gallery-scroll-container"
        >
          {isLoading && galleries.length === 0 ? (
            Array.from({ length: 5 }, (_, i) => (
              <HorizontalScrollSkeletonCard key={`skeleton-${i}`} />
            ))
          ) : galleries.length === 0 ? (
            <div className="flex items-center justify-center w-full py-8">
              <p className="text-base-content/60">No galleries from fellows yet</p>
            </div>
          ) : (
            <>
              {galleries.map((gallery) => (
                <HorizontalScrollCard
                  key={gallery.gallery_id}
                  gallery={gallery}
                />
              ))}

              {/* Loading more skeleton */}
              {isFetchingNextPage && (
                <>
                  {Array.from({ length: 3 }, (_, i) => (
                    <HorizontalScrollSkeletonCard key={`loading-skeleton-${i}`} />
                  ))}
                </>
              )}

              {/* Intersection observer target for infinite scroll */}
              {observerTarget && (
                <div 
                  ref={observerTarget} 
                  className="flex-shrink-0"
                  style={{ width: '1px', height: '1px' }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};
