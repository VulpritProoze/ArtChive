import { Link } from 'react-router-dom';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useUserSummary } from '@hooks/queries/use-user-summary';
import { formatNumber } from '@utils/format-number.util';

interface UserHoverModalProps {
  userId: number;
  isVisible: boolean;
}

export default function UserHoverModal({
  userId,
  isVisible,
}: UserHoverModalProps) {
  const { data: userSummary, isLoading } = useUserSummary(userId, isVisible);

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
              <div className="avatar">
                <div className="w-12 h-12 rounded-full border-2 border-primary">
                  <img
                    src={userSummary.profile_picture || '/static_img/default-pic-min.jpg'}
                    alt={userSummary.username}
                    className="object-cover"
                  />
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

