import { useState } from 'react';
import { ArrowLeft, Check, X as XIcon, Clock, Users, UserPlus2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePendingFriendRequests } from '@hooks/queries/use-fellows';
import { useAcceptFriendRequest, useRejectFriendRequest } from '@hooks/mutations/use-fellow-mutations';
import { useAuth } from '@context/auth-context';
import { Link } from 'react-router-dom';
import { SimpleLoadingSpinner } from '@components/loading-spinner';
import { MainLayout } from '@components/common/layout';

type TabType = 'received' | 'sent';

export default function PendingFriendRequestsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('received');
  const { data: requests, isLoading } = usePendingFriendRequests();
  const { mutateAsync: acceptRequest, isPending: isAccepting } = useAcceptFriendRequest();
  const { mutateAsync: rejectRequest, isPending: isRejecting } = useRejectFriendRequest();

  // Separate received and sent requests
  const receivedRequests = requests?.filter(
    (req) => req.fellow_user === user?.id && req.status === 'pending'
  ) || [];
  const sentRequests = requests?.filter(
    (req) => req.user === user?.id && req.status === 'pending'
  ) || [];

  const handleAccept = async (requestId: number) => {
    // Find the request to get the requester's name and user ID
    const request = receivedRequests.find(r => r.id === requestId);
    const requesterName = request?.user_info?.fullname || request?.user_info?.username || 'this user';
    const requesterUserId = request?.user;
    
    if (!window.confirm(`Are you sure you want to accept the friend request from ${requesterName}?`)) {
      return;
    }
    
    if (!requesterUserId) {
      console.error('Could not find requester user ID for request:', requestId);
      return;
    }
    
    try {
      await acceptRequest({ requestId, userId: requesterUserId });
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      // Find the request to get the requester's user ID
      const request = receivedRequests.find(r => r.id === requestId);
      const requesterUserId = request?.user;
      if (!requesterUserId) {
        console.error('Could not find requester user ID for request:', requestId);
        return;
      }
      await rejectRequest({ requestId, userId: requesterUserId });
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  return (
    <MainLayout showRightSidebar={false}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <ArrowLeft className="w-5 h-5 flex-shrink-0" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <UserPlus2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-base-content">Friend Requests</h1>
              <p className="text-sm text-base-content/60">
                Manage your pending friend requests
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="bg-base-200/50 rounded-xl p-2 border border-base-300">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('received')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'received'
                    ? 'bg-primary text-primary-content shadow-md scale-[1.02]'
                    : 'hover:bg-base-300 text-base-content'
                }`}
              >
                <UserPlus2 className="w-4 h-4 flex-shrink-0" />
                Received ({receivedRequests.length})
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'sent'
                    ? 'bg-primary text-primary-content shadow-md scale-[1.02]'
                    : 'hover:bg-base-300 text-base-content'
                }`}
              >
                <Clock className="w-4 h-4 flex-shrink-0" />
                Sent ({sentRequests.length})
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <SimpleLoadingSpinner text="Loading requests..." />
          </div>
        ) : (
          <div>
            {/* Received Requests Tab */}
            {activeTab === 'received' && (
              <div>
                {receivedRequests.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {receivedRequests.map((request) => {
                      const requester = request.user_info;
                      return (
                        <div
                          key={request.id}
                          className="bg-base-200/50 rounded-xl p-4 border border-base-300 hover:shadow-lg transition-shadow"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <Link
                              to={`/profile/@${requester.username}`}  // DO NOT MODIFY THE '@'!!!!!!
                              className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity min-w-0"
                            >
                              <div className="avatar">
                                <div className="w-14 h-14 rounded-full border-2 border-primary">
                                  <img
                                    src={requester.profile_picture || '/static_img/default-pic-min.jpg'}
                                    alt={requester.username}
                                    className="object-cover"
                                  />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-base-content truncate">
                                  {requester.fullname || `@${requester.username}`}
                                </h3>
                                <p className="text-sm text-base-content/60 truncate">
                                  @{requester.username}
                                </p>
                                {requester.artist_types && requester.artist_types.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {requester.artist_types.slice(0, 2).map((type, index) => (
                                      <span
                                        key={index}
                                        className="badge badge-xs badge-primary"
                                      >
                                        {type}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </Link>
                            <div className="flex flex-col gap-2">
                              <button
                                className="btn btn-sm btn-primary gap-2"
                                onClick={() => handleAccept(request.id)}
                                disabled={isAccepting || isRejecting}
                              >
                                <Check className="w-4 h-4 flex-shrink-0" />
                                Accept
                              </button>
                              <button
                                className="btn btn-sm btn-ghost gap-2"
                                onClick={() => handleReject(request.id)}
                                disabled={isAccepting || isRejecting}
                              >
                                <XIcon className="w-4 h-4 flex-shrink-0" />
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Users className="w-16 h-16 text-base-content/30 mb-4" />
                    <h2 className="text-2xl font-bold text-base-content mb-2">
                      No Received Requests
                    </h2>
                    <p className="text-base-content/60 max-w-md">
                      You don't have any pending friend requests from others.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Sent Requests Tab */}
            {activeTab === 'sent' && (
              <div>
                {sentRequests.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sentRequests.map((request) => {
                      const recipient = request.fellow_user_info;
                      return (
                        <div
                          key={request.id}
                          className="bg-base-200/50 rounded-xl p-4 border border-base-300 hover:shadow-lg transition-shadow"
                        >
                          <Link
                            to={`/profile/${recipient.username}`}
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                          >
                            <div className="avatar">
                              <div className="w-14 h-14 rounded-full border-2 border-base-300">
                                <img
                                  src={recipient.profile_picture || '/static_img/default-pic-min.jpg'}
                                  alt={recipient.username}
                                  className="object-cover"
                                />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-base-content truncate">
                                {recipient.fullname || `@${recipient.username}`}
                              </h3>
                              <p className="text-sm text-base-content/60 truncate">
                                @{recipient.username}
                              </p>
                              {recipient.artist_types && recipient.artist_types.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {recipient.artist_types.slice(0, 2).map((type, index) => (
                                    <span
                                      key={index}
                                      className="badge badge-xs badge-primary"
                                    >
                                      {type}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className="badge badge-warning flex items-center gap-1">
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              Pending
                            </span>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Users className="w-16 h-16 text-base-content/30 mb-4" />
                    <h2 className="text-2xl font-bold text-base-content mb-2">
                      No Sent Requests
                    </h2>
                    <p className="text-base-content/60 max-w-md">
                      You haven't sent any pending friend requests.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

