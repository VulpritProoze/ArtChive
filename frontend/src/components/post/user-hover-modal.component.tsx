import { Link } from 'react-router-dom';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useUserSummary } from '@hooks/queries/use-user-summary';
import { formatNumber } from '@utils/format-number.util';
import { useQuery } from '@tanstack/react-query';
import { avatarService } from '@services/avatar.service';
import { useState, useEffect } from 'react';
import '@components/avatar/avatar-animations.css';

interface UserHoverModalProps {
  userId: number;
  isVisible: boolean;
}

export default function UserHoverModal({
  userId,
  isVisible,
}: UserHoverModalProps) {
  const { data: userSummary, isLoading } = useUserSummary(userId, isVisible);
  const [showThumbnail, setShowThumbnail] = useState(false);

  // Fetch avatar thumbnail when modal is visible
  const { data: avatarThumbnail } = useQuery({
    queryKey: ['user-avatar-thumbnail', userId],
    queryFn: () => avatarService.getPrimaryAvatarThumbnailByUserId(userId),
    enabled: isVisible,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Timer to switch to thumbnail after 1.5 seconds
  useEffect(() => {
    if (!isVisible) {
      setShowThumbnail(false);
      return;
    }

    const timer = setTimeout(() => {
      if (avatarThumbnail?.has_primary_avatar && avatarThumbnail.thumbnail) {
        setShowThumbnail(true);
      }
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, [isVisible, avatarThumbnail]);

  if (!isVisible) return null;

  return (
    <div
      className="absolute z-50 bg-base-100 rounded-xl shadow-2xl border border-base-300 p-4 w-64 animate-in fade-in zoom-in-95 duration-200"
      style={{
        top: '100%',
        left: 0,
        marginTop: '8px',
      }}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="loading loading-spinner loading-sm"></div>
        </div>
      ) : userSummary ? (
        <Link
          to={`/profile/@${userSummary.id}`} // Do not modify the "@"!
          className="block hover:opacity-90 transition-opacity"
        >
          <div className="flex flex-col gap-3">
            {/* User Header */}
            <div className="flex items-center gap-3">
              <div className="avatar relative">
                <div 
                  className="w-12 h-12 rounded-full border-2 border-primary overflow-hidden relative transition-colors duration-500"
                  style={{
                    backgroundColor: showThumbnail && avatarThumbnail?.background 
                      ? avatarThumbnail.background 
                      : undefined,
                  }}
                >
                  {/* Profile Picture */}
                  <img
                    src={userSummary.profile_picture || '/static_img/default-pic-min.jpg'}
                    alt={userSummary.username}
                    className={`object-cover w-full h-full transition-all duration-500 ease-in-out ${
                      showThumbnail 
                        ? 'opacity-0 scale-95 -translate-y-1' 
                        : 'opacity-100 scale-100 translate-y-0'
                    }`}
                  />
                  {/* Avatar Thumbnail (appears after 1.5 seconds) */}
                  {avatarThumbnail?.has_primary_avatar && avatarThumbnail.thumbnail && (
                    <img
                      src={avatarThumbnail.thumbnail}
                      alt={`${userSummary.username}'s avatar`}
                      className={`absolute inset-0 object-cover w-full h-full transition-all duration-500 ease-in-out ${
                        showThumbnail 
                          ? 'opacity-100 scale-100 translate-y-0' 
                          : 'opacity-0 scale-95 translate-y-1'
                      } ${
                        showThumbnail && avatarThumbnail.animation && avatarThumbnail.animation !== 'none'
                          ? `avatar-${avatarThumbnail.animation}`
                          : ''
                      }`}
                    />
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base-content truncate">
                  {userSummary.fullname || `@${userSummary.username}`}
                </h3>
                <p className="text-xs text-base-content/60 truncate">
                  @{userSummary.username}
                </p>
              </div>
            </div>

            {/* Artist Types */}
            {userSummary.artist_types && userSummary.artist_types.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {userSummary.artist_types.slice(0, 3).map((type, index) => (
                  <span
                    key={index}
                    className="badge badge-sm badge-primary text-xs"
                  >
                    {type}
                  </span>
                ))}
                {userSummary.artist_types.length > 3 && (
                  <span className="badge badge-sm badge-ghost text-xs">
                    +{userSummary.artist_types.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Statistics */}
            <div className="border-t border-base-300 pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(() => {
                    const reputation = userSummary.reputation ?? 0;
                    const isPositive = reputation > 0;
                    const isNegative = reputation < 0;
                    return (
                      <>
                        {isPositive ? (
                          <ArrowUp className="w-4 h-4 text-success flex-shrink-0" />
                        ) : isNegative ? (
                          <ArrowDown className="w-4 h-4 text-error flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4"></div>
                        )}
                        <div>
                          <p className="text-xs text-base-content/60">Reputation</p>
                          <p
                            className={`text-sm font-semibold ${
                              isPositive
                                ? 'text-success'
                                : isNegative
                                ? 'text-error'
                                : 'text-base-content'
                            }`}
                          >
                            {formatNumber(reputation)}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Placeholder for future statistics */}
            <div className="border-t border-base-300 pt-3">
              <p className="text-xs text-base-content/50 text-center">
                More statistics coming soon
              </p>
            </div>
          </div>
        </Link>
      ) : (
        <div className="text-center py-4 text-base-content/60 text-sm">
          User not found
        </div>
      )}
    </div>
  );
}

