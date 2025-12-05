import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { collective } from "@lib/api";
import { CollectiveLayout } from "@components/common/layout";
import { toast } from "@utils/toast.util";
import { handleApiError, formatErrorForToast } from "@utils";
import { useAuth } from "@context/auth-context";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShield, faUser, faCrown } from "@fortawesome/free-solid-svg-icons";
import type { Member, Channel } from "@types";
import { useCollectiveData } from "@hooks/queries/use-collective-data";
import { SkeletonMemberCard } from "@components/common/skeleton";

// Helper function to construct full name
const getFullName = (member: Member) => {
  const parts = [member.first_name, member.middle_name, member.last_name].filter(Boolean);
  return parts.join(' ') || member.username;
};

export default function CollectiveMembers() {
  const { collectiveId } = useParams<{ collectiveId: string }>();
  const navigate = useNavigate();
  const { isAdminOfACollective } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch collective data for CollectiveLayout
  const {
    data: collectiveData,
    isLoading: loadingCollective,
  } = useCollectiveData(collectiveId);

  useEffect(() => {
    if (collectiveId) {
      fetchMembers();
    }
  }, [collectiveId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await collective.get(`/${collectiveId}/members/`);
      setMembers(response.data);
    } catch (error) {
      console.error("Error fetching members:", error);
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to load members', formatErrorForToast(message));
    } finally {
      setLoading(false);
    }
  };

  const adminMembers = members.filter((m) => m.collective_role === "admin");
  const regularMembers = members.filter((m) => m.collective_role === "member");

  const handleChannelClick = (_channel: Channel) => {
    // Navigate to collective home page when channel is clicked
    navigate(`/collective/${collectiveId}`);
  };

  const handleShowCreateChannelModal = () => {
    // Navigate to collective home page where channel creation is available
    navigate(`/collective/${collectiveId}`);
  };

  return (
    <CollectiveLayout
      skipMainLayout={false}
      showSidebar={true}
      showRightSidebar={false}
      showCollectiveRightSidebar={false}
      collectiveData={collectiveData}
      loadingCollective={loadingCollective}
      onChannelClick={handleChannelClick}
      onShowCreateChannelModal={isAdminOfACollective(collectiveId) ? handleShowCreateChannelModal : undefined}
    >
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {collectiveData?.title || 'Collective'} Members
          </h1>
          {!loading && (
            <p className="text-base-content/70">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Admin Actions Button */}
        {!loading && isAdminOfACollective(collectiveId) && (
          <div className="mb-6">
            <button
              onClick={() => navigate(`/collective/${collectiveId}/admin`)}
              className="btn btn-primary"
            >
              <FontAwesomeIcon icon={faShield} className="mr-2" />
              Admin Management
            </button>
          </div>
        )}

        {/* Loading State - Skeleton Cards */}
        {loading ? (
          <>
            <div className="mb-8">
              <div className="skeleton h-7 w-32 mb-4"></div>
              <SkeletonMemberCard count={3} />
            </div>
            <div>
              <div className="skeleton h-7 w-32 mb-4"></div>
              <SkeletonMemberCard count={6} />
            </div>
          </>
        ) : (
          <>
            {/* Admins Section */}
            {adminMembers.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={faCrown} className="text-warning" />
                  Admins ({adminMembers.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {adminMembers.map((member) => (
                    <MemberCard key={member.id} member={member} />
                  ))}
                </div>
              </div>
            )}

            {/* Members Section */}
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faUser} className="text-base-content/70" />
                Members ({regularMembers.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {regularMembers.map((member) => (
                  <MemberCard key={member.id} member={member} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </CollectiveLayout>
  );
}

function MemberCard({ member }: { member: Member }) {
  return (
    <Link
      to={`/profile/@${member.username}`}
      className="card bg-base-200 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="card-body p-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="avatar">
            <div className="w-12 h-12 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
              {member.profile_picture ? (
                <img src={member.profile_picture} alt={member.username} />
              ) : (
                <div className="bg-primary flex items-center justify-center text-primary-content font-bold">
                  {member.username[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base truncate">{getFullName(member)}</h3>
            <p className="text-sm text-base-content/70 truncate">
              @{member.username}
            </p>
            {member.collective_role === "admin" && (
              <div className="badge badge-warning badge-sm mt-1">
                <FontAwesomeIcon icon={faShield} className="mr-1" />
                Admin
              </div>
            )}
          </div>
        </div>

        {/* Artist Types */}
        {member.artist_types && member.artist_types.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {member.artist_types.slice(0, 2).map((type, index) => (
              <span
                key={index}
                className="badge badge-sm badge-outline"
              >
                {type}
              </span>
            ))}
            {member.artist_types.length > 2 && (
              <span className="badge badge-sm badge-ghost">
                +{member.artist_types.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
