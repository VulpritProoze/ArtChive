import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collective } from "@lib/api";
import { MainLayout } from "@components/common/layout";
import { LoadingSpinner } from "../loading-spinner";
import { toast } from "react-toastify";
import { handleApiError } from "@utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUserMinus,
  faUserShield,
  faCheck,
  faTimes,
  faEnvelope,
} from "@fortawesome/free-solid-svg-icons";

interface Member {
  id: number;
  member_id: number;
  username: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  profile_picture: string | null;
  collective_role: "member" | "admin";
}

interface AdminRequest {
  request_id: string;
  requester: number;
  requester_username: string;
  requester_first_name: string;
  requester_middle_name: string;
  requester_last_name: string;
  requester_profile_picture: string | null;
  message: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

// Helper functions to construct full names
const getMemberFullName = (member: Member) => {
  const parts = [member.first_name, member.middle_name, member.last_name].filter(Boolean);
  return parts.join(' ') || member.username;
};

const getRequesterFullName = (request: AdminRequest) => {
  const parts = [request.requester_first_name, request.requester_middle_name, request.requester_last_name].filter(Boolean);
  return parts.join(' ') || request.requester_username;
};

export default function CollectiveAdmin() {
  const { collectiveId } = useParams<{ collectiveId: string }>();
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [adminRequests, setAdminRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [collectiveTitle, setCollectiveTitle] = useState("");
  const [activeTab, setActiveTab] = useState<"members" | "requests">("members");

  useEffect(() => {
    fetchData();
  }, [collectiveId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch members
      const membersResponse = await collective.get(`/${collectiveId}/members/`);
      setMembers(membersResponse.data);

      // Fetch admin requests
      const requestsResponse = await collective.get(
        `/${collectiveId}/admin/requests/?status=pending`
      );
      setAdminRequests(requestsResponse.data);

      // Fetch collective details
      const collectiveResponse = await collective.get(`/${collectiveId}/`);
      setCollectiveTitle(collectiveResponse.data.title);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error(handleApiError(error, {}));
    } finally {
      setLoading(false);
    }
  };

  const handleKickMember = async (memberId: number, username: string) => {
    if (
      !window.confirm(
        `Are you sure you want to remove ${username} from this collective?`
      )
    ) {
      return;
    }

    try {
      await collective.delete(`/${collectiveId}/members/kick/`, {
        data: { member_id: memberId },
      });
      toast.success(`${username} has been removed from the collective.`);
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error kicking member:", error);
      toast.error(handleApiError(error, {}));
    }
  };

  const handleAdminRequest = async (
    requestId: string,
    action: "approve" | "reject",
    username: string
  ) => {
    try {
      await collective.post(`/admin/requests/${requestId}/process/`, {
        action,
      });
      toast.success(
        `Admin request from ${username} has been ${action}d successfully.`
      );
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error processing admin request:", error);
      toast.error(handleApiError(error, {}));
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <LoadingSpinner text="Loading admin panel..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/collective/${collectiveId}`)}
            className="btn btn-ghost btn-sm mb-4"
          >
            ← Back to Collective
          </button>
          <h1 className="text-3xl font-bold mb-2">Admin Management</h1>
          <p className="text-base-content/70">{collectiveTitle}</p>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed mb-6">
          <a
            className={`tab ${activeTab === "members" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("members")}
          >
            <FontAwesomeIcon icon={faUserMinus} className="mr-2" />
            Manage Members ({members.length})
          </a>
          <a
            className={`tab ${activeTab === "requests" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("requests")}
          >
            <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
            Admin Requests ({adminRequests.length})
          </a>
        </div>

        {/* Members Tab */}
        {activeTab === "members" && (
          <div>
            <div className="alert alert-info mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <span>
                You can remove members from the collective. Note: You cannot
                remove the last admin.
              </span>
            </div>

            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="card bg-base-200 shadow-md"
                >
                  <div className="card-body p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="avatar">
                          <div className="w-12 h-12 rounded-full">
                            {member.profile_picture ? (
                              <img
                                src={member.profile_picture}
                                alt={member.username}
                              />
                            ) : (
                              <div className="bg-primary flex items-center justify-center text-primary-content font-bold">
                                {member.username[0]?.toUpperCase() || "?"}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Info */}
                        <div>
                          <h3 className="font-bold text-base">
                            {getMemberFullName(member)}
                          </h3>
                          <p className="text-sm text-base-content/70">
                            @{member.username}
                          </p>
                          {member.collective_role === "admin" && (
                            <div className="badge badge-warning badge-sm mt-1">
                              <FontAwesomeIcon
                                icon={faUserShield}
                                className="mr-1"
                              />
                              Admin
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <button
                        className="btn btn-error btn-sm"
                        onClick={() =>
                          handleKickMember(member.member_id, member.username)
                        }
                      >
                        <FontAwesomeIcon icon={faUserMinus} className="mr-2" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {members.length === 0 && (
                <div className="text-center py-12 bg-base-200/50 rounded-xl">
                  <p className="text-base-content/70">No members found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admin Requests Tab */}
        {activeTab === "requests" && (
          <div>
            <div className="alert alert-warning mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>
                Review and approve/reject admin role requests from members.
              </span>
            </div>

            <div className="space-y-4">
              {adminRequests.map((request) => (
                <div
                  key={request.request_id}
                  className="card bg-base-200 shadow-md"
                >
                  <div className="card-body p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Avatar */}
                        <div className="avatar">
                          <div className="w-12 h-12 rounded-full">
                            {request.requester_profile_picture ? (
                              <img
                                src={request.requester_profile_picture}
                                alt={request.requester_username}
                              />
                            ) : (
                              <div className="bg-primary flex items-center justify-center text-primary-content font-bold">
                                {request.requester_username[0]?.toUpperCase() ||
                                  "?"}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                          <h3 className="font-bold text-base">
                            {getRequesterFullName(request)}
                          </h3>
                          <p className="text-sm text-base-content/70 mb-2">
                            @{request.requester_username}
                          </p>
                          {request.message && (
                            <div className="bg-base-300 rounded-lg p-3 mb-2">
                              <p className="text-sm italic">
                                "{request.message}"
                              </p>
                            </div>
                          )}
                          <p className="text-xs text-base-content/60">
                            Requested on{" "}
                            {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() =>
                            handleAdminRequest(
                              request.request_id,
                              "approve",
                              request.requester_username
                            )
                          }
                        >
                          <FontAwesomeIcon icon={faCheck} className="mr-1" />
                          Approve
                        </button>
                        <button
                          className="btn btn-error btn-sm"
                          onClick={() =>
                            handleAdminRequest(
                              request.request_id,
                              "reject",
                              request.requester_username
                            )
                          }
                        >
                          <FontAwesomeIcon icon={faTimes} className="mr-1" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {adminRequests.length === 0 && (
                <div className="text-center py-12 bg-base-200/50 rounded-xl">
                  <p className="text-base-content/70">
                    No pending admin requests.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
