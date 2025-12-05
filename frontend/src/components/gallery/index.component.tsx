import { useNavigate } from "react-router-dom";
import { ArrowRight, Images } from "lucide-react";
import { MainLayout } from "../common/layout";
import { useEffect, useRef, useState, useMemo } from "react";
import { useGalleryList, useTopGalleries } from "@hooks/queries/use-gallery";
import { useFellowsGalleries } from "@hooks/queries/use-fellows-galleries";
import { galleryService } from "@services/gallery.service";
import { FellowsGallerySection } from "@components/common/gallery-feature/section/fellows-gallery-section.component";
import { BestGalleriesSection } from "@components/common/gallery-feature/section/best-galleries-section.component";
import { OtherGalleriesSection } from "@components/common/gallery-feature/section/other-galleries-section.component";


const GalleryIndex = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const fellowsObserverTarget = useRef<HTMLDivElement>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [animationIndex, setAnimationIndex] = useState(0);
  const [awards, setAwards] = useState<Record<string, Record<string, number>>>({});
  const [loadingAwards, setLoadingAwards] = useState(false);

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

  // Fetch fellows galleries with infinite scrolling
  const {
    data: fellowsGalleriesData,
    fetchNextPage: fetchNextFellowsPage,
    hasNextPage: hasNextFellowsPage,
    isFetchingNextPage: isFetchingNextFellowsPage,
    isLoading: isLoadingFellowsGalleries,
  } = useFellowsGalleries(10); // 10 items per page

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

  // Flatten fellows galleries pages
  const fellowsGalleries = useMemo(() => {
    return fellowsGalleriesData?.pages.flatMap((page) => page.results) ?? [];
  }, [fellowsGalleriesData]);

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


  // Infinite scrolling behavior for other galleries
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

  // Infinite scrolling behavior for fellows galleries
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasNextFellowsPage &&
          !isFetchingNextFellowsPage &&
          !isLoadingFellowsGalleries
        ) {
          fetchNextFellowsPage();
        }
      },
      { threshold: 0.5 }
    );

    if (fellowsObserverTarget.current) {
      observer.observe(fellowsObserverTarget.current);
    }

    return () => {
      if (fellowsObserverTarget.current) {
        observer.unobserve(fellowsObserverTarget.current);
      }
      observer.disconnect();
    };
  }, [hasNextFellowsPage, isFetchingNextFellowsPage, isLoadingFellowsGalleries, fetchNextFellowsPage]);


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
        <FellowsGallerySection
          galleries={fellowsGalleries}
          animationIndex={animationIndex}
          isLoading={isLoadingFellowsGalleries}
          isFetchingNextPage={isFetchingNextFellowsPage}
          hasNextPage={hasNextFellowsPage}
          fetchNextPage={fetchNextFellowsPage}
          observerTarget={fellowsObserverTarget}
        />

        {/* Best Galleries Recently Section - Carousel */}
        <BestGalleriesSection
          galleries={topGalleries}
          isLoading={isLoadingTopGalleries}
          isSmallScreen={isSmallScreen}
        />

        {/* Browse Other Galleries Section */}
        <OtherGalleriesSection
          galleries={galleries}
          loading={loading}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          fetchNextPage={fetchNextPage}
          awards={awards}
          loadingAwards={loadingAwards}
          animationIndex={animationIndex}
          observerTarget={observerTarget}
        />
      </div>

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
