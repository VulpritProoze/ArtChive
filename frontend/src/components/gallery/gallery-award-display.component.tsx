import { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@context/auth-context';
import type { GalleryAward } from '@hooks/queries/use-gallery-awards';

interface GalleryAwardDisplayProps {
  awards: GalleryAward[];
  onOpenAwardModal: () => void;
  onOpenAwardList: () => void;
}

interface GroupedAward {
  author: number;
  author_username: string;
  author_picture?: string | null;
  awards: {
    id: number;
    award_type: string;
    brush_drip_value: number;
    awarded_at: string;
  }[];
  totalValue: number;
}

/**
 * Gallery Award Display Component
 * Inherits the same style as post awards (TrophyListModal style)
 * Displays gallery awards grouped by user
 */
export default function GalleryAwardDisplay({
  awards,
  onOpenAwardModal,
  onOpenAwardList,
}: GalleryAwardDisplayProps) {
  const { user } = useAuth();

  // Filter out deleted awards and group by user (same style as TrophyListModal)
  const groupedAwards: GroupedAward[] = useMemo(() => {
    // Debug: Log awards data
    console.log('GalleryAwardDisplay - awards received:', awards);
    
    // Filter out deleted awards
    const activeAwards = awards.filter(award => !award.is_deleted);
    console.log('GalleryAwardDisplay - activeAwards:', activeAwards);
    
    return activeAwards.reduce((acc, award) => {
      // Skip if award_type or brush_drip_value is missing
      if (!award.award_type || award.brush_drip_value === undefined) {
        console.warn('Invalid award data:', award);
        return acc;
      }
      
      const existingUser = acc.find((item) => item.author === award.author);

      if (existingUser) {
        existingUser.awards.push({
          id: award.id,
          award_type: award.award_type,
          brush_drip_value: award.brush_drip_value,
          awarded_at: award.awarded_at,
        });
        existingUser.totalValue += award.brush_drip_value;
      } else {
        acc.push({
          author: award.author,
          author_username: award.author_username,
          author_picture: award.author_picture,
          awards: [
            {
              id: award.id,
              award_type: award.award_type,
              brush_drip_value: award.brush_drip_value,
              awarded_at: award.awarded_at,
            },
          ],
          totalValue: award.brush_drip_value,
        });
      }

      return acc;
    }, [] as GroupedAward[]);
  }, [awards]);

  // Debug: Log grouped awards
  console.log('GalleryAwardDisplay - groupedAwards:', groupedAwards);

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

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-semibold text-lg">Gallery Awards ({awards.filter(a => !a.is_deleted).length})</h4>
        {user && (
          <button className="btn btn-sm btn-primary" onClick={onOpenAwardModal}>
            <FontAwesomeIcon icon={faTrophy} className="mr-2" />
            Award Gallery
          </button>
        )}
      </div>

      {groupedAwards.length === 0 ? (
        <div className="text-center py-12">
          <FontAwesomeIcon
            icon={faTrophy}
            className="text-6xl text-base-content/30 mb-3"
          />
          <p className="text-lg font-medium text-base-content/70">No awards yet</p>
          <p className="text-sm text-base-content/50 mt-1">Be the first to award this gallery!</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {groupedAwards.map((userAwards) => (
              <div
                key={userAwards.author}
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-base-200 transition-colors"
              >
                {/* User Avatar */}
                <img
                  src={
                    userAwards.author_picture ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(userAwards.author_username)}&background=random&size=40`
                  }
                  alt={userAwards.author_username}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userAwards.author_username)}&background=random&size=40`;
                  }}
                />

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-base-content truncate">
                    {userAwards.author_username}
                  </p>
                  <p className="text-xs text-base-content/60 truncate">
                    @{userAwards.author_username}
                  </p>
                  {/* Total Value */}
                  <p className="text-xs text-warning font-semibold mt-1">
                    {userAwards.totalValue} BD total
                  </p>
                </div>

                {/* Award Badges */}
                <div className="flex flex-wrap gap-1 flex-shrink-0 max-w-[120px] justify-end">
                  {userAwards.awards.map((award) => (
                    <div
                      key={award.id}
                      className="flex flex-col items-center"
                      title={`${award.award_type.replace('_', ' ')} - ${award.brush_drip_value} BD`}
                    >
                      <span className="text-2xl">{getAwardEmoji(award.award_type)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {groupedAwards.length > 0 && (
            <div className="mt-4 text-center">
              <button className="btn btn-sm btn-outline" onClick={onOpenAwardList}>
                View All Awards
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

