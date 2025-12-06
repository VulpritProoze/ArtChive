import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MoreVertical, User, MessageCircle, Flag, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import type { GalleryListItem } from '@types';
import { formatNumber } from '@utils/format-number.util';
import TrophyListModal from '@components/common/posts-feature/modal/trophy-list.modal';

interface BestGalleriesCarouselMultiProps {
  galleries: GalleryListItem[];
  isLoading: boolean;
}

export const BestGalleriesCarouselMulti = ({ galleries, isLoading }: BestGalleriesCarouselMultiProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState<number | null>(null);
  const [baseScale, setBaseScale] = useState(1);
  const [baseCardWidth, setBaseCardWidth] = useState(700); // Default for screens above 1300px
  const [animationIndex, setAnimationIndex] = useState(0);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : galleries.length - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev < galleries.length - 1 ? prev + 1 : 0));
  };

  const scrollToIndex = (index: number) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const containerWidth = container.offsetWidth;
      const scaledCardWidth = baseCardWidth * baseScale;
      
      // Center the selected card: scroll so selected card is in the middle position
      const cardPosition = index * scaledCardWidth;
      const scrollPosition = cardPosition - (containerWidth / 2) + (scaledCardWidth / 2);
      
      container.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: 'smooth',
      });
    }
  };

  // Calculate base card width based on screen size and scale
  useEffect(() => {
    const calculateDimensions = () => {
      if (!scrollContainerRef.current) {
        // Retry after a short delay if container not ready
        setTimeout(calculateDimensions, 100);
        return;
      }

      const width = window.innerWidth;
      let newBaseCardWidth = 800; // Default
      if (width >= 1300) {
        newBaseCardWidth = 1000;
      } else if (width >= 1150) {
        newBaseCardWidth = 900;
      } else {
        newBaseCardWidth = 800;
      }

      setBaseCardWidth(newBaseCardWidth);

      // Calculate scale immediately after setting width
      const container = scrollContainerRef.current;
      const containerWidth = container.offsetWidth;
      const padding = 64; // 2rem on each side
      const availableWidth = containerWidth - padding;
      const scale = availableWidth / (newBaseCardWidth * 3); // baseCardWidth per card, 3 cards
      setBaseScale(Math.max(0.3, Math.min(1, scale))); // Clamp between 0.3 and 1
    };

    // Initial calculation
    calculateDimensions();
    
    // Also calculate after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(calculateDimensions, 50);
    
    const handleResize = () => {
      calculateDimensions();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (selectedIndex < galleries.length) {
      scrollToIndex(selectedIndex);
    }
  }, [selectedIndex, baseScale, baseCardWidth]);

  // Cycle through animations every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationIndex((prev) => (prev + 1) % 3); // Cycle through 0, 1, 2
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <section className="mb-12">
        <div className={`bg-gradient-to-r from-[var(--local-primary,var(--color-primary))] via-[var(--local-primary,var(--color-primary))]/90 to-[var(--local-primary,var(--color-primary))] text-primary-content py-3 px-4 lg:px-6 mb-4 rounded-t-xl shadow-md section-header-animated animation-${animationIndex}`}>
          <h2 className="text-xl lg:text-2xl font-bold">Best Galleries Recently</h2>
        </div>

        {/* Multi Card Carousel Container */}
        <div className="relative -mx-4 lg:-mx-6">
          <div className="px-4 lg:px-6">
            <div
              className="flex scroll-smooth carousel-container items-center"
              style={{ 
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                height: '350px',
              }}
            >
              <style>{`
                .carousel-container::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              {Array.from({ length: 5 }).map((_, i) => {
                const scaledWidth = baseCardWidth * baseScale;
                return (
                  <div
                    key={i}
                    className="flex-shrink-0 transition-all duration-300 flex items-center justify-center"
                    style={{
                      width: `${scaledWidth}px`,
                      minWidth: `${scaledWidth}px`,
                      maxWidth: `${scaledWidth}px`,
                      transform: `scale(${0.85})`,
                      zIndex: 1,
                      transformOrigin: 'center center',
                    }}
                  >
                    <div className="card bg-base-100 rounded-xl overflow-hidden shadow-lg transition-all duration-300 relative" style={{ width: `${baseCardWidth}px` }}>
                      <div className="relative bg-base-300 overflow-hidden w-full h-full">
                        <div className="w-full h-full skeleton"></div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 backdrop-blur-md bg-black/40 text-white">
                        <div className="p-2 lg:p-3 flex flex-col">
                          <div className="skeleton h-4 w-3/4 mb-2 bg-white/20"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (galleries.length === 0) {
    return null;
  }

  return (
    <section className="mb-12">
      {/* Purple Banner */}
      <div className={`bg-gradient-to-r from-[var(--local-primary,var(--color-primary))] via-[var(--local-primary,var(--color-primary))]/90 to-[var(--local-primary,var(--color-primary))] text-primary-content py-3 px-4 lg:px-6 mb-4 rounded-t-xl shadow-md section-header-animated animation-${animationIndex}`}>
        <h2 className="text-xl lg:text-2xl font-bold">Best Galleries Recently</h2>
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
      `}</style>

      {/* Multi Card Carousel Container */}
      <div className="relative -mx-4 lg:-mx-6">
        <div className="px-4 lg:px-6">
          <div
            ref={scrollContainerRef}
            className="flex overflow-x-auto scroll-smooth carousel-container items-center"
            style={{ 
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              height: '350px', // Fixed height for carousel container
            }}
          >
            <style>{`
              .carousel-container::-webkit-scrollbar {
                display: none;
              }
            `}</style>
          {galleries.map((gallery, index) => {
            const creator = gallery.creator_details;
            const artistTypes = creator?.artist_types?.length > 0 
              ? creator.artist_types.join(', ') 
              : 'Artist';
            const reputation = creator?.reputation ?? 0;
            const isPositive = reputation > 0;
            const isNegative = reputation < 0;
            const isSelected = index === selectedIndex;
            const isHovered = hoveredIndex === index;

            // Calculate width based on base scale to eliminate gaps
            const scaledWidth = baseCardWidth * baseScale; // Width for layout (accounts for base scale)
            
            return (
              <div
                key={gallery.gallery_id}
                className="flex-shrink-0 transition-all duration-300 flex items-center justify-center"
                style={{
                  width: `${scaledWidth}px`, // Set explicit width to match scaled size - eliminates gaps
                  minWidth: `${scaledWidth}px`, // Prevent shrinking
                  maxWidth: `${scaledWidth}px`, // Prevent expanding
                  transform: (() => {
                    // Apply additional scale on top of base scale for selected/hovered
                    if (isSelected) {
                      return `scale(${1.05})`; // 5% larger than base
                    } else if (isHovered) {
                      return `scale(${0.95})`; // 2% larger than base
                    }
                    return `scale(${0.85})`; // 15% smaller than base
                  })(),
                  zIndex: isSelected ? 20 : isHovered ? 10 : 1,
                  transformOrigin: 'center center',
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => setSelectedIndex(index)}
              >
                <div className="card bg-base-100 h-74 rounded-xl overflow-hidden shadow-lg transition-all duration-300 relative" style={{ width: `${baseCardWidth}px` }}>
                  <Link
                    to={`/gallery/${creator?.id}`}
                    className="block w-full h-full relative"
                  >
                    {/* Full width image */}
                    <div className="relative bg-base-300 overflow-hidden w-full h-full">
                      <img
                        src={gallery.picture || '/landing-page/artworks/artwork1.avif'}
                        alt={gallery.title}
                        className="w-full h-full object-cover"
                        style={{ width: '100%', height: '100%' }}
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/landing-page/artworks/artwork1.avif';
                        }}
                      />
                      
                      {/* Awards display - top left with blurred background */}
                      {gallery.awards && Object.keys(gallery.awards).length > 0 && (
                        <div 
                          className="absolute top-2 left-4 backdrop-blur-md bg-black/40 rounded-lg px-1.5 py-1 flex items-center gap-1 cursor-pointer hover:bg-black/50 transition-colors z-20"
                          onClick={(e) => handleAwardClick(e, gallery.gallery_id)}
                          title="View awards"
                        >
                          {Object.entries(gallery.awards).map(([awardType, count]) => (
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
                      className="absolute bottom-0 left-0 right-0 transition-all duration-300 backdrop-blur-md bg-black/40 text-white"
                      style={{
                        height: isSelected || isHovered ? 'auto' : 'auto',
                        maxHeight: isSelected || isHovered ? '50%' : 'auto',
                      }}
                    >
                      <div className={`p-2 lg:p-3 flex flex-col transition-all duration-300 ${
                        isSelected || isHovered ? 'h-full' : 'h-auto'
                      }`}>
                        {/* Title - always visible */}
                        <h3 className="font-bold text-xs mb-1 truncate text-white">{gallery.title}</h3>
                        
                        {/* Additional details - only visible on hover */}
                        {(isSelected || isHovered) && (
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

                  {/* Menu Button - Show on hover or when selected */}
                  {(isSelected || isHovered) && (
                    <div className="absolute top-3 right-3 z-30">
                      <div className="dropdown dropdown-end">
                        <button
                          className="btn btn-circle btn-sm bg-black/50 backdrop-blur-sm border-0 hover:bg-black/70 text-white"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowDropdown(showDropdown === index ? null : index);
                          }}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {showDropdown === index && (
                          <ul className="dropdown-content menu p-2 shadow-xl bg-base-100 rounded-box w-42 border border-base-300 mt-2 z-50">
                            <li>
                              <Link
                                to={`/profile/@${creator?.username}`}
                                className="gap-3 text-xs"
                                onClick={() => setShowDropdown(null)}
                              >
                                <User className="w-4 h-4 text-primary" />
                                <span>View artist profile</span>
                              </Link>
                            </li>
                            <li>
                              <div title="Coming Soon">
                                <Link
                                  to="#"
                                  className="gap-3 opacity-50 cursor-not-allowed text-xs flex"
                                  onClick={(e) => e.preventDefault()}
                                >
                                  <MessageCircle className="w-4 h-4 text-primary" />
                                  <span>Converse with artist</span>
                                </Link>
                              </div>
                            </li>
                            <li>
                              <div title="Coming Soon">
                                <Link
                                  to="#"
                                  className="gap-3 opacity-50 cursor-not-allowed text-xs flex"
                                  onClick={(e) => e.preventDefault()}
                                >
                                  <Flag className="w-4 h-4 text-primary" />
                                  <span>Report gallery</span>
                                </Link>
                              </div>
                            </li>
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>

        {/* Navigation Buttons */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handlePrev();
          }}
          className="absolute left-2 top-[48%] btn btn-circle btn-lg bg-black/50 backdrop-blur-sm border-0 hover:bg-black/70 text-white z-30"
          aria-label="Previous gallery"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleNext();
          }}
          className="absolute right-2 top-[48%] btn btn-circle btn-lg bg-black/50 backdrop-blur-sm border-0 hover:bg-black/70 text-white z-30"
          aria-label="Next gallery"
        >
          <ChevronRight className="w-7 h-7" />
        </button>
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
    </section>
  );
};

