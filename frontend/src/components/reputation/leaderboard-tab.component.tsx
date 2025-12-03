import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@context/auth-context';
import { useReputationLeaderboard, useMyLeaderboardPosition } from '@hooks/queries/use-reputation';
import { formatNumber } from '@utils/format-number.util';
import { LoadingSpinner } from '@components/loading-spinner';
import { Trophy, Medal, ChevronLeft, ChevronRight } from 'lucide-react';

interface LeaderboardTabProps {
  className?: string;
}

export const LeaderboardTab: React.FC<LeaderboardTabProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const limit = 25;
  const offset = (page - 1) * limit;

  const { data: leaderboardData, isLoading: isLoadingLeaderboard } = useReputationLeaderboard({
    limit,
    offset,
  });

  const { data: myPosition, isLoading: isLoadingPosition } = useMyLeaderboardPosition();

  const leaderboard = leaderboardData?.results || [];
  const totalCount = leaderboardData?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Medal className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return null;
  };

  const jumpToMyPosition = () => {
    if (myPosition?.rank) {
      const targetPage = Math.ceil(myPosition.rank / limit);
      setPage(targetPage);
    }
  };

  if (isLoadingLeaderboard || isLoadingPosition) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <LoadingSpinner text="Loading leaderboard..." />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* My Position Card */}
      {myPosition && (
        <div className="card bg-gradient-to-br from-reputation/20 to-reputation/10 border border-reputation/30 shadow-lg">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-base-content mb-1">Your Position</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-reputation">#{myPosition.rank}</span>
                  <span className="text-base-content/70">out of {totalCount} users</span>
                </div>
                <p className="text-sm text-base-content/60 mt-1">
                  Reputation: <span className="font-semibold text-reputation">{formatNumber(myPosition.reputation)}</span>
                </p>
              </div>
              <button
                onClick={jumpToMyPosition}
                className="btn btn-sm btn-outline btn-reputation"
                disabled={!myPosition.rank}
              >
                Jump to My Position
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="card bg-base-100 shadow-xl border border-base-300">
        <div className="card-body">
          <h3 className="card-title text-base-content mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-reputation" />
            Top Users
          </h3>

          {leaderboard.length === 0 ? (
            <div className="text-center py-12 text-base-content/60">
              <p>No users found in the leaderboard.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th className="w-16">Rank</th>
                      <th>User</th>
                      <th className="text-right">Reputation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry) => {
                      const isCurrentUser = user && entry.id === user.id;
                      return (
                        <tr
                          key={entry.id}
                          className={isCurrentUser ? 'bg-reputation/10' : ''}
                        >
                          <td>
                            <div className="flex items-center gap-2">
                              {getRankIcon(entry.rank) || (
                                <span className="font-semibold text-base-content/70">#{entry.rank}</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <Link
                              to={`/profile/@${entry.username}`}
                              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                            >
                              <div className="avatar">
                                <div className="w-10 h-10 rounded-full">
                                  <img
                                    src={entry.profile_picture || '/default-avatar.png'}
                                    alt={entry.fullname || entry.username}
                                  />
                                </div>
                              </div>
                              <div>
                                <div className="font-semibold text-base-content">
                                  {entry.fullname || entry.username}
                                </div>
                                <div className="text-sm text-base-content/60">@{entry.username}</div>
                              </div>
                            </Link>
                          </td>
                          <td className="text-right">
                            <span
                              className={`font-bold ${entry.reputation < 0 ? 'text-reputation' : 'text-base-content'}`}
                              title={`${entry.reputation} Reputation`}
                            >
                              {formatNumber(entry.reputation)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn btn-sm btn-ghost"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-base-content/70">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn btn-sm btn-ghost"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

