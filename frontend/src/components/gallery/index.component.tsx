import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { flushSync } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Info, ArrowRight, Images } from "lucide-react";
import { MainLayout } from "../common/layout";

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

const otherGalleries: GalleryCard[] = Array.from({ length: 6 }, (_, i) => ({
  id: `other-${i}`,
  title: `Gallery ${i + 1}`,
  artistName: `Artist ${i + 1}`,
  artistHandle: `@artist${i + 1}`,
  artistType: "Digital Artist",
  imageUrl: `/landing-page/artworks/${artworkImages[(i + 5) % artworkImages.length]}`,
}));

const GalleryIndex = () => {
  const navigate = useNavigate();
  const [fellowsIndex, setFellowsIndex] = useState(0);
  const [bestIndex, setBestIndex] = useState(0);
  const fellowsScrollRef = useRef<HTMLDivElement>(null);
  const bestScrollRef = useRef<HTMLDivElement>(null);
  const isScrollingProgrammatically = useRef(false);
  const pendingScrollPosition = useRef<{ ref: React.RefObject<HTMLDivElement | null>; position: number } | null>(null);

  const scrollCarousel = (
    ref: React.RefObject<HTMLDivElement | null>,
    direction: 'left' | 'right',
    setIndex: React.Dispatch<React.SetStateAction<number>>,
    itemCount: number,
    currentIndex: number
  ) => {
    if (!ref.current) return;
    
    // Get actual padding from computed styles - px-12 = 48px on mobile, lg:px-16 = 64px on large screens
    const computedPadding = window.getComputedStyle(ref.current).paddingLeft;
    const padding = parseInt(computedPadding) || 48; // Fallback to 48px if parsing fails
    
    // Calculate new index
    let newIndex: number;
    if (direction === 'left') {
      newIndex = Math.max(0, currentIndex - 1);
    } else {
      newIndex = Math.min(itemCount - 1, currentIndex + 1);
    }
    
    // Get the target child element
    const targetChild = ref.current.children[newIndex] as HTMLElement;
    if (!targetChild) {
      console.error('[Carousel] Target child not found', { newIndex, childrenCount: ref.current.children.length });
      return;
    }
    
    // Set flag immediately to prevent scroll event handler from interfering
    isScrollingProgrammatically.current = true;
    
    // Calculate target scroll position before re-render
    const targetScrollPosition = targetChild.offsetLeft - padding;
    const scrollPos = Math.max(0, targetScrollPosition);
    
    // Store the scroll position to apply after re-render
    pendingScrollPosition.current = { ref, position: scrollPos };
    
    // Immediately set scroll position BEFORE state update to prevent flash
    if (ref.current) {
      ref.current.scrollLeft = scrollPos;
      // Also disable snap temporarily to prevent interference
      ref.current.style.scrollSnapType = 'none';
    }
    
    // Use flushSync to force synchronous update and prevent flash
    flushSync(() => {
      setIndex(newIndex);
    });
    
    // Immediately restore scroll position after sync update
    if (ref.current) {
      ref.current.scrollLeft = scrollPos;
    }
    
    // Wait for React to finish re-rendering, then smooth scroll
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!ref.current) {
          isScrollingProgrammatically.current = false;
          pendingScrollPosition.current = null;
          return;
        }
        
        // Get the target child again after re-render
        const updatedTargetChild = ref.current.children[newIndex] as HTMLElement;
        if (!updatedTargetChild) {
          isScrollingProgrammatically.current = false;
          pendingScrollPosition.current = null;
          return;
        }
        
        // Recalculate scroll position after re-render (in case layout changed)
        const recalculatedScrollPosition = updatedTargetChild.offsetLeft - padding;
        const finalScrollPos = Math.max(0, recalculatedScrollPosition);
        
        // Ensure scroll position is maintained
        ref.current.scrollLeft = finalScrollPos;
        
        // Temporarily disable snap to prevent interference
        const originalSnapType = ref.current.style.scrollSnapType;
        ref.current.style.scrollSnapType = 'none';
        
        // Smooth scroll to final position
        ref.current.scrollTo({ 
          left: finalScrollPos, 
          behavior: 'smooth' 
        });
        
        // Clear pending scroll position
        pendingScrollPosition.current = null;
        
        // Re-enable snap and clear flag after scroll completes
        setTimeout(() => {
          if (ref.current) {
            ref.current.style.scrollSnapType = originalSnapType || 'x mandatory';
          }
          // Clear flag after scroll completes
          setTimeout(() => {
            isScrollingProgrammatically.current = false;
          }, 200);
        }, 600);
      });
    });
  };

  // Restore scroll position after re-render to prevent flash
  // This runs synchronously after render but before paint
  useLayoutEffect(() => {
    if (pendingScrollPosition.current && pendingScrollPosition.current.ref.current) {
      const { ref: scrollRef, position } = pendingScrollPosition.current;
      if (scrollRef.current) {
        // Force immediate scroll to prevent flash - this happens before browser paint
        scrollRef.current.scrollLeft = position;
      }
    }
  }, [fellowsIndex, bestIndex]); // Run whenever index changes

  // Update index based on scroll position with throttling
  useEffect(() => {
    let fellowsTimeout: NodeJS.Timeout;
    let bestTimeout: NodeJS.Timeout;

    const handleFellowsScroll = () => {
      // Ignore scroll events during programmatic scrolling
      if (isScrollingProgrammatically.current) return;
      
      if (!fellowsScrollRef.current) return;
      clearTimeout(fellowsTimeout);
      fellowsTimeout = setTimeout(() => {
        if (!fellowsScrollRef.current || isScrollingProgrammatically.current) return;
        const cardWidth = 224; // w-56 = 224px for fellows
        const gap = 24;
        const computedPadding = window.getComputedStyle(fellowsScrollRef.current).paddingLeft;
        const padding = parseInt(computedPadding) || 48;
        const scrollLeft = fellowsScrollRef.current.scrollLeft;
        // Account for padding when calculating index
        const adjustedScrollLeft = Math.max(0, scrollLeft - padding);
        const newIndex = Math.round(adjustedScrollLeft / (cardWidth + gap));
        const clampedIndex = Math.max(0, Math.min(9, newIndex)); // 10 galleries (0-9)
        
        setFellowsIndex(clampedIndex);
      }, 100);
    };

    const handleBestScroll = () => {
      // Ignore scroll events during programmatic scrolling
      if (isScrollingProgrammatically.current) return;
      
      if (!bestScrollRef.current) return;
      clearTimeout(bestTimeout);
      bestTimeout = setTimeout(() => {
        if (!bestScrollRef.current || isScrollingProgrammatically.current) return;
        const cardWidth = 320;
        const gap = 24;
        const computedPadding = window.getComputedStyle(bestScrollRef.current).paddingLeft;
        const padding = parseInt(computedPadding) || 48;
        const scrollLeft = bestScrollRef.current.scrollLeft;
        const adjustedScrollLeft = Math.max(0, scrollLeft - padding);
        const newIndex = Math.round(adjustedScrollLeft / (cardWidth + gap));
        setBestIndex(newIndex);
      }, 100);
    };

    const fellowsRef = fellowsScrollRef.current;
    const bestRef = bestScrollRef.current;

    if (fellowsRef) {
      fellowsRef.addEventListener('scroll', handleFellowsScroll, { passive: true });
    }
    if (bestRef) {
      bestRef.addEventListener('scroll', handleBestScroll, { passive: true });
    }

    return () => {
      clearTimeout(fellowsTimeout);
      clearTimeout(bestTimeout);
      if (fellowsRef) {
        fellowsRef.removeEventListener('scroll', handleFellowsScroll);
      }
      if (bestRef) {
        bestRef.removeEventListener('scroll', handleBestScroll);
      }
    };
  }, []);

  const GalleryCarouselCard = ({ gallery, showAvatar = false }: { gallery: GalleryCard; showAvatar?: boolean }) => {
    const cardWidth = showAvatar ? 'w-56' : 'w-80'; // Slimmer for fellows (w-56 = 224px)
    const cardHeight = showAvatar ? 'h-48' : 'h-64'; // Smaller height for fellows
    const imageSrc = gallery.imageUrl || '/landing-page/artworks/artwork1.avif';
    
    return (
      <div className={`flex-shrink-0 ${cardWidth} rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group hover:scale-[1.02]`}>
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
        <div className="bg-primary text-primary-content p-2.5">
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
      </div>
    );
  };

  const GalleryGridCard = ({ gallery }: { gallery: GalleryCard }) => {
    const imageSrc = gallery.imageUrl || '/landing-page/artworks/artwork1.avif';
    
    return (
      <Link
        to={`/gallery/${gallery.id}`}
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
        {gallery.likes !== undefined && (
          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-2 text-white text-sm">
              <span>❤️</span>
              <span>{gallery.likes}</span>
            </div>
            {gallery.comments !== undefined && (
              <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-2 text-white text-sm">
                <span>💬</span>
                <span>{gallery.comments}</span>
              </div>
            )}
          </div>
        )}
        </div>
        <div className="bg-primary text-primary-content p-3">
          <h3 className="font-semibold text-sm truncate mb-1.5">{gallery.title}</h3>
          {gallery.artistName && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-base-200 skeleton flex-shrink-0"></div>
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

  const CarouselSection = ({
    title,
    galleries,
    scrollRef,
    currentIndex,
    setCurrentIndex,
    showDropdowns = false,
  }: {
    title: string;
    galleries: GalleryCard[];
    scrollRef: React.RefObject<HTMLDivElement | null>;
    currentIndex: number;
    setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
    showDropdowns?: boolean;
  }) => (
    <section className="mb-12">
      {/* Purple Banner */}
      <div className="bg-gradient-to-r from-primary to-primary/90 text-primary-content py-3 px-4 lg:px-6 mb-4 rounded-t-xl shadow-md">
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

      {/* Carousel Container */}
      <div className="relative">
        {/* Left Arrow */}
        <button
          onClick={() => {
            if (title === "Fellows You Follow") {
              console.log('[Fellows Left Button]', {
                currentIndex,
                galleriesLength: galleries.length,
                willNavigateTo: Math.max(0, currentIndex - 1),
                isDisabled: currentIndex === 0
              });
            }
            scrollCarousel(scrollRef, 'left', setCurrentIndex, galleries.length, currentIndex);
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 btn btn-circle btn-sm bg-base-100/90 backdrop-blur-sm shadow-lg border border-base-300 hover:bg-base-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 hover:scale-110 active:scale-95"
          aria-label="Previous"
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Scrollable Cards */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide px-12 lg:px-16 scroll-smooth"
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            scrollBehavior: 'smooth',
            scrollSnapType: 'x mandatory'
          }}
        >
          {galleries.map((gallery) => (
            <div 
              key={gallery.id} 
              className="snap-start transition-transform duration-300 ease-in-out"
              style={{
                scrollSnapAlign: 'start',
                scrollSnapStop: 'always'
              }}
            >
              <GalleryCarouselCard
                gallery={gallery}
                showAvatar={title === "Fellows You Follow"}
              />
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => {
            if (title === "Fellows You Follow") {
              console.log('[Fellows Right Button]', {
                currentIndex,
                galleriesLength: galleries.length,
                maxIndex: galleries.length - 1,
                willNavigateTo: Math.min(galleries.length - 1, currentIndex + 1),
                isDisabled: currentIndex >= galleries.length - 1
              });
            }
            scrollCarousel(scrollRef, 'right', setCurrentIndex, galleries.length, currentIndex);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 btn btn-circle btn-sm bg-base-100/90 backdrop-blur-sm shadow-lg border border-base-300 hover:bg-base-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 hover:scale-110 active:scale-95"
          aria-label="Next"
          disabled={currentIndex >= galleries.length - 1}
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Pagination Dots */}
        {title === "Fellows You Follow" && (
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: galleries.length }, (_, i) => {
              // Each dot represents a single card
              const isActive = currentIndex === i;
              
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (scrollRef.current) {
                      const cardWidth = 224; // w-56 = 224px for fellows
                      const gap = 24;
                      const padding = 48; // px-12 = 48px
                      const scrollPosition = padding + (i * (cardWidth + gap));
                      
                      console.log('[Fellows Dot Click]', {
                        dotIndex: i,
                        cardWidth,
                        gap,
                        padding,
                        scrollPosition,
                        currentScrollLeft: scrollRef.current.scrollLeft
                      });
                      
                      scrollRef.current.scrollTo({ 
                        left: scrollPosition, 
                        behavior: 'smooth' 
                      });
                      setCurrentIndex(() => i);
                    }
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'bg-primary w-8'
                      : 'bg-base-300 hover:bg-base-400 w-2'
                  }`}
                  aria-label={`Go to card ${i + 1}`}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );

  return (
    <MainLayout showRightSidebar={false}>
      <div className="container mx-auto px-4 lg:px-8 py-8">
        {/* Navigation Button to My Galleries */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => navigate('/gallery/me')}
            className="btn btn-primary gap-2 hover:gap-3 transition-all duration-200"
          >
            <Images className="w-4 h-4" />
            <span>My Galleries</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Fellows You Follow Section */}
        <CarouselSection
          title="Fellows You Follow"
          galleries={fellowsGalleries}
          scrollRef={fellowsScrollRef}
          currentIndex={fellowsIndex}
          setCurrentIndex={setFellowsIndex}
        />

        {/* Best Galleries Recently Section */}
        <CarouselSection
          title="Best Galleries Recently"
          galleries={bestGalleries}
          scrollRef={bestScrollRef}
          currentIndex={bestIndex}
          setCurrentIndex={setBestIndex}
          showDropdowns={true}
        />

        {/* Browse Other Galleries Section */}
        <section className="mb-12">
          {/* Purple Banner */}
          <div className="bg-gradient-to-r from-primary to-primary/90 text-primary-content py-3 px-4 lg:px-6 mb-4 rounded-t-xl shadow-md">
            <h2 className="text-xl lg:text-2xl font-bold">Browse Other Galleries</h2>
          </div>

          {/* Gallery Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 lg:px-8">
            {otherGalleries.map((gallery) => (
              <GalleryGridCard key={gallery.id} gallery={gallery} />
            ))}
          </div>
        </section>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </MainLayout>
  );
};

export default GalleryIndex;
