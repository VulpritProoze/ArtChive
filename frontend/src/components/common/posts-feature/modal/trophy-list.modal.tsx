import { useMemo } from "react";
import { X } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrophy } from "@fortawesome/free-solid-svg-icons";
import { usePostTrophies } from "@hooks/queries/use-post-lists";
import { useGalleryAwards } from "@hooks/queries/use-gallery-awards";

interface TrophyListModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId?: string;
  galleryId?: string;
  targetType?: 'post' | 'gallery';
}

interface GroupedTrophy {
  author: number;
  author_username: string;
  author_fullname: string;
  author_picture?: string;
  trophies: {
    id: number;
    trophy_type_name: string;
    trophy_brush_drip_value: number;
    awarded_at: string;
  }[];
  totalValue: number;
}

export default function TrophyListModal({
  isOpen,
  onClose,
  postId,
  galleryId,
  targetType = 'post',
}: TrophyListModalProps) {
  const finalTargetType = targetType || (postId ? 'post' : 'gallery');
  const finalTargetId = postId || galleryId || '';

  // Use appropriate hook based on target type
  const {
    data: postTrophiesData,
    fetchNextPage: fetchNextPostTrophies,
    hasNextPage: hasNextPostTrophies,
    isFetchingNextPage: isFetchingNextPostTrophies,
    isLoading: isLoadingPostTrophies,
  } = usePostTrophies(finalTargetId, isOpen && finalTargetType === 'post');

  const {
    data: galleryAwardsData,
    fetchNextPage: fetchNextGalleryAwards,
    hasNextPage: hasNextGalleryAwards,
    isFetchingNextPage: isFetchingNextGalleryAwards,
    isLoading: isLoadingGalleryAwards,
  } = useGalleryAwards(finalTargetId, { enabled: isOpen && finalTargetType === 'gallery' });

  // Normalize data structure
  const trophies = useMemo(() => {
    if (finalTargetType === 'gallery') {
      const awards = galleryAwardsData?.pages.flatMap((page) => page.results || []) ?? [];
      return awards.map(award => ({
        id: award.id,
        author: award.author,
        author_username: award.author_username,
        author_fullname: award.author_username, // Gallery awards don't have fullname in response
        author_picture: award.author_picture,
        trophy_type_name: award.award_type,
        trophy_brush_drip_value: award.brush_drip_value,
        awarded_at: award.awarded_at,
      }));
    } else {
      return postTrophiesData?.pages.flatMap((page) => page.results || []) ?? [];
    }
  }, [postTrophiesData, galleryAwardsData, finalTargetType]);

  const isLoading = finalTargetType === 'gallery' ? isLoadingGalleryAwards : isLoadingPostTrophies;
  const hasNextPage = finalTargetType === 'gallery' ? hasNextGalleryAwards : hasNextPostTrophies;
  const isFetchingNextPage = finalTargetType === 'gallery' ? isFetchingNextGalleryAwards : isFetchingNextPostTrophies;
  const fetchNextPage = finalTargetType === 'gallery' ? fetchNextGalleryAwards : fetchNextPostTrophies;

  const getTrophyEmoji = (trophyType: string) => {
    switch (trophyType.toLowerCase()) {
      case "bronze_stroke":
        return "🥉";
      case "golden_bristle":
        return "🥈";
      case "diamond_canvas":
        return "🥇";
      default:
        return "🏆";
    }
  };

  // Group trophies by user
  const groupedTrophies: GroupedTrophy[] = useMemo(() => {
    return trophies.reduce((acc, trophy) => {
      const existingUser = acc.find((item) => item.author === trophy.author);
      
      if (existingUser) {
        existingUser.trophies.push({
          id: trophy.id,
          trophy_type_name: trophy.trophy_type_name,
          trophy_brush_drip_value: trophy.trophy_brush_drip_value,
          awarded_at: trophy.awarded_at,
        });
        existingUser.totalValue += trophy.trophy_brush_drip_value;
      } else {
        acc.push({
          author: trophy.author,
          author_username: trophy.author_username,
          author_fullname: trophy.author_fullname,
          author_picture: trophy.author_picture,
          trophies: [{
            id: trophy.id,
            trophy_type_name: trophy.trophy_type_name,
            trophy_brush_drip_value: trophy.trophy_brush_drip_value,
            awarded_at: trophy.awarded_at,
          }],
          totalValue: trophy.trophy_brush_drip_value,
        });
      }
      
      return acc;
    }, [] as GroupedTrophy[]);
  }, [trophies]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-base-100 rounded-2xl shadow-2xl w-full max-w-md max-h-[600px] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faTrophy}
              className="text-warning text-xl"
            />
            <h3 className="text-lg font-bold text-base-content">
              {finalTargetType === 'gallery' ? 'Gallery Awards' : 'Trophies'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle hover:bg-base-200"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && trophies.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="loading loading-spinner loading-md text-primary"></div>
            </div>
          ) : trophies.length === 0 ? (
            <div className="text-center py-12">
              <FontAwesomeIcon
                icon={faTrophy}
                className="text-6xl text-base-content/30 mb-3"
              />
              <p className="text-base-content/70">No trophies yet</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {groupedTrophies.map((userTrophies) => (
                  <div
                    key={userTrophies.author}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-base-200 transition-colors"
                  >
                    {/* User Avatar */}
                    <img
                      src={userTrophies.author_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(userTrophies.author_username)}&background=random&size=40`}
                      alt={userTrophies.author_username}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userTrophies.author_username)}&background=random&size=40`;
                      }}
                    />
                    
                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-base-content truncate">
                        {userTrophies.author_fullname}
                      </p>
                      <p className="text-xs text-base-content/60 truncate">
                        @{userTrophies.author_username}
                      </p>
                      {/* Total Value */}
                      <p className="text-xs text-warning font-semibold mt-1">
                        {userTrophies.totalValue} BD total
                      </p>
                    </div>

                    {/* Trophy Badges */}
                    <div className="flex flex-wrap gap-1 flex-shrink-0 max-w-[120px] justify-end">
                      {userTrophies.trophies.map((trophy) => (
                        <div
                          key={trophy.id}
                          className="flex flex-col items-center"
                          title={`${trophy.trophy_type_name.replace('_', ' ')} - ${trophy.trophy_brush_drip_value} BD`}
                        >
                          <span className="text-2xl">
                            {getTrophyEmoji(trophy.trophy_type_name)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {hasNextPage && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="btn btn-sm btn-outline"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <span className="loading loading-spinner loading-xs" />
                        Loading...
                      </>
                    ) : (
                      "Load More"
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
