import { useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, MapPin, Clock } from "lucide-react";
import { MainLayout } from "../common/layout";
import { useEffect, useRef, useState, useMemo } from "react";
import { galleryService } from "@services/gallery.service";
import { useInfiniteQuery } from "@tanstack/react-query";
import { SkeletonGalleryGridCard } from "@components/common/skeleton";
import { optimizeGalleryPicture, optimizeProfilePicture } from "@utils/cloudinary-transform.util";
import { Link } from "react-router-dom";

interface Exhibit {
  exhibit_id: string;
  gallery_title: string;
  gallery_picture: string;
  gallery_creator_username: string;
  organizer_name: string;
  city: string;
  country: string;
  start_date: string;
  end_date: string;
  is_upcoming: boolean;
  is_ongoing: boolean;
  is_past: boolean;
  created_at: string;
  creator_details?: {
    id: number;
    username: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    profile_picture: string | null;
    artist_types: string[];
    brush_drips_count: number;
    reputation: number;
  };
}

interface ExhibitSectionProps {
  title: string;
  icon: React.ReactNode;
  exhibits: Exhibit[];
  isLoading: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  observerTarget?: React.RefObject<HTMLDivElement | null>;
}

const ExhibitSection = ({
  title,
  icon,
  exhibits,
  isLoading,
  isFetchingNextPage = false,
  hasNextPage = false,
  fetchNextPage,
  observerTarget,
}: ExhibitSectionProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        {icon}
        <h2 className="text-2xl font-bold text-base-content">{title}</h2>
      </div>

      {isLoading && exhibits.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <SkeletonGalleryGridCard key={i} />
          ))}
        </div>
      ) : exhibits.length === 0 ? (
        <div className="text-center py-12 bg-base-200 rounded-xl">
          <p className="text-base-content/60">No exhibits found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {exhibits.map((exhibit) => (
              <Link
                key={exhibit.exhibit_id}
                to={`/gallery/${exhibit.gallery_creator_username}`}
                className="card bg-base-100 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group"
              >
                <figure className="relative h-48 overflow-hidden">
                  <img
                    src={optimizeGalleryPicture(exhibit.gallery_picture)}
                    alt={exhibit.gallery_title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/static/images/default_600x400.png';
                    }}
                  />
                  {exhibit.is_ongoing && (
                    <div className="absolute top-2 right-2 bg-success text-success-content px-2 py-1 rounded-md text-xs font-semibold">
                      Ongoing
                    </div>
                  )}
                  {exhibit.is_upcoming && (
                    <div className="absolute top-2 right-2 bg-info text-info-content px-2 py-1 rounded-md text-xs font-semibold">
                      Upcoming
                    </div>
                  )}
                </figure>
                <div className="card-body p-4">
                  <h3 className="card-title text-base line-clamp-2 mb-2">
                    {exhibit.gallery_title}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-base-content/70">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span className="line-clamp-1">
                        {exhibit.city}, {exhibit.country}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {formatDate(exhibit.start_date)} - {formatDate(exhibit.end_date)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span className="line-clamp-1">{exhibit.organizer_name}</span>
                    </div>
                  </div>

                  {exhibit.creator_details && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-base-300">
                      <img
                        src={optimizeProfilePicture(exhibit.creator_details.profile_picture)}
                        alt={exhibit.creator_details.username}
                        className="w-6 h-6 rounded-full"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/static/images/default-pic-min.jpg';
                        }}
                      />
                      <span className="text-xs text-base-content/60">
                        {exhibit.creator_details.username}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {hasNextPage && observerTarget && (
            <div ref={observerTarget} className="h-10 flex items-center justify-center mt-6">
              {isFetchingNextPage && (
                <div className="loading loading-spinner loading-md"></div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const ExhibitsComponent = () => {
  const navigate = useNavigate();
  const ongoingObserverTarget = useRef<HTMLDivElement>(null);
  const upcomingObserverTarget = useRef<HTMLDivElement>(null);
  const nearYouObserverTarget = useRef<HTMLDivElement>(null);

  // Fetch ongoing exhibits
  const {
    data: ongoingData,
    fetchNextPage: fetchNextOngoingPage,
    hasNextPage: hasNextOngoingPage,
    isFetchingNextPage: isFetchingNextOngoingPage,
    isLoading: isLoadingOngoing,
  } = useInfiniteQuery({
    queryKey: ['exhibits', 'ongoing'],
    queryFn: ({ pageParam = 1 }) => {
      return galleryService.getOngoingExhibits(pageParam as number, 10);
    },
    getNextPageParam: (lastPage, pages) => {
      const totalPages = Math.ceil(lastPage.count / 10);
      const currentPage = pages.length;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
  });

  // Fetch upcoming exhibits
  const {
    data: upcomingData,
    fetchNextPage: fetchNextUpcomingPage,
    hasNextPage: hasNextUpcomingPage,
    isFetchingNextPage: isFetchingNextUpcomingPage,
    isLoading: isLoadingUpcoming,
  } = useInfiniteQuery({
    queryKey: ['exhibits', 'upcoming'],
    queryFn: ({ pageParam = 1 }) => {
      return galleryService.getUpcomingExhibits(pageParam as number, 10);
    },
    getNextPageParam: (lastPage, pages) => {
      const totalPages = Math.ceil(lastPage.count / 10);
      const currentPage = pages.length;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
  });

  // Fetch exhibits near you
  const {
    data: nearYouData,
    fetchNextPage: fetchNextNearYouPage,
    hasNextPage: hasNextNearYouPage,
    isFetchingNextPage: isFetchingNextNearYouPage,
    isLoading: isLoadingNearYou,
  } = useInfiniteQuery({
    queryKey: ['exhibits', 'near-you'],
    queryFn: ({ pageParam = 1 }) => {
      return galleryService.getExhibitsNearYou(pageParam as number, 10);
    },
    getNextPageParam: (lastPage, pages) => {
      const totalPages = Math.ceil(lastPage.count / 10);
      const currentPage = pages.length;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
  });

  // Flatten pages into arrays
  const ongoingExhibits = useMemo(() => {
    return ongoingData?.pages.flatMap((page) => page.results as Exhibit[]) ?? [];
  }, [ongoingData]);

  const upcomingExhibits = useMemo(() => {
    return upcomingData?.pages.flatMap((page) => page.results as Exhibit[]) ?? [];
  }, [upcomingData]);

  const nearYouExhibits = useMemo(() => {
    return nearYouData?.pages.flatMap((page) => page.results as Exhibit[]) ?? [];
  }, [nearYouData]);

  // Infinite scroll for ongoing exhibits
  useEffect(() => {
    if (!hasNextOngoingPage || isFetchingNextOngoingPage || isLoadingOngoing) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextOngoingPage();
        }
      },
      { threshold: 0.5 }
    );

    if (ongoingObserverTarget.current) {
      observer.observe(ongoingObserverTarget.current);
    }

    return () => {
      if (ongoingObserverTarget.current) {
        observer.unobserve(ongoingObserverTarget.current);
      }
      observer.disconnect();
    };
  }, [hasNextOngoingPage, isFetchingNextOngoingPage, isLoadingOngoing, fetchNextOngoingPage]);

  // Infinite scroll for upcoming exhibits
  useEffect(() => {
    if (!hasNextUpcomingPage || isFetchingNextUpcomingPage || isLoadingUpcoming) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextUpcomingPage();
        }
      },
      { threshold: 0.5 }
    );

    if (upcomingObserverTarget.current) {
      observer.observe(upcomingObserverTarget.current);
    }

    return () => {
      if (upcomingObserverTarget.current) {
        observer.unobserve(upcomingObserverTarget.current);
      }
      observer.disconnect();
    };
  }, [hasNextUpcomingPage, isFetchingNextUpcomingPage, isLoadingUpcoming, fetchNextUpcomingPage]);

  // Infinite scroll for near you exhibits
  useEffect(() => {
    if (!hasNextNearYouPage || isFetchingNextNearYouPage || isLoadingNearYou) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextNearYouPage();
        }
      },
      { threshold: 0.5 }
    );

    if (nearYouObserverTarget.current) {
      observer.observe(nearYouObserverTarget.current);
    }

    return () => {
      if (nearYouObserverTarget.current) {
        observer.unobserve(nearYouObserverTarget.current);
      }
      observer.disconnect();
    };
  }, [hasNextNearYouPage, isFetchingNextNearYouPage, isLoadingNearYou, fetchNextNearYouPage]);

  return (
    <MainLayout showRightSidebar={false}>
      <div className="container mx-auto px-4 lg:px-8 py-8">
        {/* Navigation Button */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => navigate('/gallery')}
            className="btn gap-2 text-primary-content hover:gap-3 transition-all duration-200"
            style={{ backgroundColor: 'var(--local-primary, var(--color-primary))' }}
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            <span>Back to Galleries</span>
          </button>
        </div>

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-base-content mb-2">Exhibits</h1>
          <p className="text-base-content/60">Discover art exhibitions happening around you</p>
        </div>

        {/* Currently Exhibiting Section */}
        <ExhibitSection
          title="Currently Exhibiting"
          icon={<Clock className="w-6 h-6 text-success" />}
          exhibits={ongoingExhibits}
          isLoading={isLoadingOngoing}
          isFetchingNextPage={isFetchingNextOngoingPage}
          hasNextPage={hasNextOngoingPage}
          fetchNextPage={fetchNextOngoingPage}
          observerTarget={ongoingObserverTarget}
        />

        {/* Upcoming Exhibits Section */}
        <ExhibitSection
          title="Upcoming Exhibits"
          icon={<Calendar className="w-6 h-6 text-info" />}
          exhibits={upcomingExhibits}
          isLoading={isLoadingUpcoming}
          isFetchingNextPage={isFetchingNextUpcomingPage}
          hasNextPage={hasNextUpcomingPage}
          fetchNextPage={fetchNextUpcomingPage}
          observerTarget={upcomingObserverTarget}
        />

        {/* Exhibits Near You Section */}
        <ExhibitSection
          title="Exhibits Near You"
          icon={<MapPin className="w-6 h-6 text-warning" />}
          exhibits={nearYouExhibits}
          isLoading={isLoadingNearYou}
          isFetchingNextPage={isFetchingNextNearYouPage}
          hasNextPage={hasNextNearYouPage}
          fetchNextPage={fetchNextNearYouPage}
          observerTarget={nearYouObserverTarget}
        />
      </div>
    </MainLayout>
  );
};

export default ExhibitsComponent;

