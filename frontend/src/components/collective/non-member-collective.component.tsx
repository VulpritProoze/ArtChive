import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Clock, UserPlus } from "lucide-react";
import { useAuth } from "@context/auth-context";
import { CollectiveLayout } from "@components/common/layout/CollectiveLayout";
import { CollectiveJoinRequestModal } from "@components/common/collective-feature/modal";
import { useCollectiveData } from "@hooks/queries/use-collective-data";
import { useBulkPendingJoinRequests } from "@hooks/queries/use-join-requests";
import { SkeletonCollectiveInfo, SkeletonHeroImage } from "@components/common/skeleton";
import type { CollectiveListItem } from "@services/collective.service";

const NonMemberCollective = () => {
  const { collectiveId } = useParams<{ collectiveId: string }>();
  const navigate = useNavigate();
  const { fetchCollectiveMemberDetails } = useAuth();
  const [heroImageError, setHeroImageError] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [selectedCollective, setSelectedCollective] = useState<CollectiveListItem | null>(null);

  // Fetch collective data
  const {
    data: collectiveData,
    isLoading: loadingCollective,
  } = useCollectiveData(collectiveId);

  // Convert collective data to CollectiveListItem for the modal
  useEffect(() => {
    if (collectiveData) {
      setSelectedCollective({
        collective_id: collectiveData.collective_id,
        title: collectiveData.title,
        description: collectiveData.description,
        rules: collectiveData.rules,
        artist_types: collectiveData.artist_types,
        picture: collectiveData.picture || '',
        created_at: collectiveData.created_at,
        updated_at: collectiveData.updated_at || collectiveData.created_at,
        channels: collectiveData.channels,
        members: collectiveData.members,
        member_count: collectiveData.member_count,
      });
    }
  }, [collectiveData]);

  // Fetch pending join request for this collective
  const { data: pendingRequestsMap = {} } = useBulkPendingJoinRequests(
    collectiveId ? [collectiveId] : [],
    Boolean(collectiveId)
  );

  const hasPendingRequest = Boolean(pendingRequestsMap[collectiveId || '']);

  const handleJoinClick = () => {
    if (selectedCollective) {
      setIsJoinModalOpen(true);
    }
  };

  const handleJoinSuccess = () => {
    // Refresh collective member details to update membership status
    fetchCollectiveMemberDetails();
    // Navigate to the member view
    navigate(`/collective/${collectiveId}`);
  };

  const handleCancelRequest = async () => {
    // Refresh to update pending status
    // The hook will automatically refetch
  };

  // Disable channel navigation for non-members
  const handleChannelClick = () => {
    // Do nothing - channels are disabled for non-members
  };

  return (
    <>
      <CollectiveLayout
        showSidebar={true}
        showRightSidebar={false}
        collectiveData={collectiveData}
        loadingCollective={loadingCollective}
        onChannelClick={handleChannelClick}
        isNonMember={true}
      >
        {/* Hero Image */}
        {collectiveData ? (
          <div className="w-full h-64 bg-gradient-to-r from-orange-400 via-yellow-300 to-blue-300 rounded-xl mb-6 overflow-hidden">
            {!heroImageError && (
              <img
                src={collectiveData.picture}
                alt=""
                className="w-full h-full object-cover"
                onError={() => {
                  setHeroImageError(true);
                }}
              />
            )}
          </div>
        ) : (
          <SkeletonHeroImage className="mb-6" />
        )}

        {/* Collective Info Section */}
        {collectiveData ? (
          <div className="bg-base-100 rounded-xl p-6 mb-6 shadow-md">
            <h1 className="text-3xl font-bold mb-3">{collectiveData.title}</h1>

            <div className="flex items-center gap-4 mb-4 text-sm text-base-content/70">
              <span className="flex items-center gap-1">
                🔒 Private Group
              </span>
              <span className="flex items-center gap-1">
                👥 {collectiveData.member_count || 0} members
              </span>
            </div>

            {/* Artist Types */}
            <div className="flex flex-wrap gap-2 mb-4">
              {collectiveData.artist_types.map((type, index) => (
                <span
                  key={index}
                  className="bg-primary text-primary-content px-3 py-1 bg-base-200 text-sm rounded-full"
                >
                  {type}
                </span>
              ))}
            </div>

            {/* Member Avatars */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex -space-x-2">
                {collectiveData.members.slice(0, 10).map((member) => (
                  <div key={member.id} className="w-10 h-10 rounded-full border-2 border-base-100 overflow-hidden">
                    <img
                      src={member.profile_picture || undefined}
                      alt={member.username}
                      className="w-full h-full object-cover"
                      title={`@${member.username}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Join Button */}
            <div className="flex gap-3 mb-6">
              {hasPendingRequest ? (
                <button
                  className="btn"
                  onClick={handleJoinClick}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Pending Request
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={handleJoinClick}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join Collective
                </button>
              )}
            </div>

            {/* Info Message */}
            <div className="bg-base-200/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-base-content/70">
                Join this collective to access channels, post content, and interact with members.
              </p>
            </div>
          </div>
        ) : (
          <SkeletonCollectiveInfo className="mb-6" />
        )}

        {/* Empty State - No channels accessible */}
        <div className="flex flex-col items-center justify-center py-20 px-6 bg-base-200/50 rounded-xl">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4 opacity-50">🔒</div>
            <h3 className="text-2xl font-bold mb-3 text-base-content">
              Join to Access Content
            </h3>
            <p className="text-base-content/70 text-lg leading-relaxed">
              Join this collective to view channels, posts, and interact with members.
            </p>
          </div>
        </div>
      </CollectiveLayout>

      {/* Join Request Modal */}
      {selectedCollective && (
        <CollectiveJoinRequestModal
          collective={selectedCollective}
          isOpen={isJoinModalOpen}
          onClose={() => {
            setIsJoinModalOpen(false);
          }}
          onSuccess={handleJoinSuccess}
          onCancelRequest={handleCancelRequest}
          existingRequestId={pendingRequestsMap[collectiveId || ''] || null}
        />
      )}
    </>
  );
};

export default NonMemberCollective;

