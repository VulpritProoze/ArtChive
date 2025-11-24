import { useEffect } from "react";
import { useAuth } from "@context/auth-context";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@components/common/layout";
import { useCollectiveContext } from "@context/collective-context";
import { SkeletonCollectiveCard } from "@components/common/skeleton";

export default function Index() {
  const navigate = useNavigate();

  const { isMemberOfACollective, fetchCollectiveMemberDetails, user } =
    useAuth();
  const { fetchCollectives, collectives, handleJoinCollectiveAsync, loading } =
    useCollectiveContext();

  useEffect(() => {
    fetchCollectives();
  }, []);

  const handleJoinCollective = async (collectiveId: string) => {
    await handleJoinCollectiveAsync(collectiveId);
    await fetchCollectiveMemberDetails();
    navigate(`/collective/${collectiveId}`);
  };

  const handleCollectiveClick = (collectiveId: string) => {
    navigate(`/collective/${collectiveId}`);
  };

  return (
    <MainLayout showSidebar={true} showRightSidebar={false}>
      <div>
        <button
          onClick={() => navigate("create")}
          className="btn btn-primary"
        >
          Create (+)
        </button>
      </div>
      <div className="space-y-6">
        {/* Page Header */}

        <div className="bg-base-200/50 rounded-xl p-6">
          <h1 className="text-3xl font-bold text-base-content mb-2">
            Discover Collectives
          </h1>
          <p className="text-base-content/70">
            Join artist communities and collaborate with fellow creators
          </p>
        </div>

        {/* Collectives Grid */}
        <div>
          {loading ? (
            <SkeletonCollectiveCard
              count={6}
              containerClassName="grid grid-cols-1 gap-4"
            />
          ) : collectives.length === 0 ? (
            <div className="text-center my-16 bg-base-200/30 rounded-xl p-12">
              <div className="text-6xl mb-4">🎨</div>
              <p className="text-lg font-semibold text-base-content">
                No collectives found.
              </p>
              <p className="text-sm text-base-content/60 mt-2">
                Be the first to create one!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {collectives.map((collective) => (
                <div
                  key={collective.collective_id}
                  className="card bg-base-100 shadow-md hover:shadow-xl transition-all duration-300 border border-base-300 cursor-pointer"
                  onClick={() => handleCollectiveClick(collective.collective_id)}
                >
                  <div className="card-body p-4">
                    <div className="flex gap-4">
                      {/* Collective Thumbnail */}
                      <div className="flex-shrink-0">
                        <div className="w-20 h-20 bg-base-300 rounded-lg overflow-hidden">
                          <img
                            src={collective.picture}
                            alt={collective.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "";
                            }}
                          />
                        </div>
                      </div>

                      {/* Collective Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h2 className="text-lg font-bold text-base-content mb-1">
                              {collective.title}
                            </h2>
                            <div className="flex items-center gap-3 text-sm text-base-content/70">
                              <span>{collective.member_count || 0} members</span>
                              <span className="flex items-center gap-1" title="Total Brush Drips">
                                <span className="w-3 h-3 rounded-full bg-primary"></span>
                                {collective.brush_drips_count || 0}
                              </span>
                              <span className="flex items-center gap-1" title="Total Posts">
                                💬 {collective.channels?.reduce((sum, ch) => sum + (ch.posts_count || 0), 0) || 0}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-cyan-500 text-sm font-medium">? online</span>
                            <div className="text-xs text-base-content/50 mt-1">
                              Active {new Date(collective.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        {/* Artist Types */}
                        {collective.artist_types.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {collective.artist_types.slice(0, 4).map((type, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-base-200 text-xs rounded-full text-base-content/80"
                              >
                                {type}
                              </span>
                            ))}
                            {collective.artist_types.length > 4 && (
                              <span className="px-3 py-1 bg-base-200 text-xs rounded-full text-base-content/60">
                                +{collective.artist_types.length - 4} more
                              </span>
                            )}
                          </div>
                        )}

                        {/* Channels */}
                        {collective.channels.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {collective.channels.slice(0, 3).map((channel) => (
                              <div
                                key={channel.channel_id}
                                className="flex items-center gap-2 text-sm text-base-content/70"
                              >
                                <span className="flex items-center gap-1">
                                  <span className="text-base-content/50">#</span>
                                  {channel.title}
                                </span>
                                <span className="badge badge-primary badge-sm"
                                  title={`${channel.posts_count ?? '?'} posts`}
                                >{channel.posts_count ?? '?'}</span>
                              </div>
                            ))}
                            {collective.channels.length > 3 && (
                              <span className="text-xs text-base-content/50">
                                +{collective.channels.length - 3} more channels
                              </span>
                            )}
                          </div>
                        )}

                        {/* Action Buttons - Hidden on hover/click to go to page */}
                        <div className="flex gap-2 mt-3">
                          {isMemberOfACollective(collective.collective_id) ? (
                            <button
                              className="btn btn-sm btn-primary"
                              disabled
                              onClick={(e) => e.stopPropagation()}
                            >
                              ✓ Joined
                            </button>
                          ) : (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleJoinCollective(collective.collective_id);
                              }}
                            >
                              Join
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}