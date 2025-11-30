import { X } from 'lucide-react';
import { usePendingFriendRequests } from '@hooks/queries/use-fellows';
import { useAcceptFriendRequest, useRejectFriendRequest } from '@hooks/mutations/use-fellow-mutations';
import { useAuth } from '@context/auth-context';
import { Link } from 'react-router-dom';
import { SimpleLoadingSpinner } from '@components/loading-spinner';

interface PendingFriendRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PendingFriendRequestsModal({
  isOpen,
  onClose,
}: PendingFriendRequestsModalProps) {
  const { user } = useAuth();
  const { data: requests, isLoading } = usePendingFriendRequests();
  const { mutateAsync: acceptRequest, isPending: isAccepting } = useAcceptFriendRequest();
  const { mutateAsync: rejectRequest, isPending: isRejecting } = useRejectFriendRequest();

  if (!isOpen) return null;

  // Separate received and sent requests
  const receivedRequests = requests?.filter(
    (req) => req.fellow_user === user?.id && req.status === 'pending'
  ) || [];
  const sentRequests = requests?.filter(
    (req) => req.user === user?.id && req.status === 'pending'
  ) || [];

  const handleAccept = async (requestId: number) => {
    try {
      await acceptRequest(requestId);
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      await rejectRequest(requestId);
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 bg-base-100 rounded-2xl shadow-2xl border border-base-300 w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-base-300">
          <h2 className="text-2xl font-bold text-base-content">Friend Requests</h2>
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={onClose}
          >
            <X className="w-5 h-5 flex-shrink-0" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <SimpleLoadingSpinner text="Loading requests..." />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Received Requests */}
              {receivedRequests.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-base-content mb-3">
                    Received ({receivedRequests.length})
                  </h3>
                  <div className="flex flex-col gap-3">
                    {receivedRequests.map((request) => {
                      const requester = request.user_info;
                      return (
                        <div
                          key={request.id}
                          className="bg-base-200/50 rounded-xl p-4 border border-base-300"
                        >
                          <div className="flex items-center justify-between">
                            <Link
                              to={`/profile/${requester.username}`}
                              className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
                              onClick={onClose}
                            >
                              <div className="avatar">
                                <div className="w-12 h-12 rounded-full border-2 border-primary">
                                  <img
                                    src={requester.profile_picture || '/static_img/default-pic-min.jpg'}
                                    alt={requester.username}
                                    className="object-cover"
                                  />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-base-content truncate">
                                  {requester.fullname || `@${requester.username}`}
                                </h4>
                                <p className="text-xs text-base-content/60 truncate">
                                  @{requester.username}
                                </p>
                              </div>
                            </Link>
                            <div className="flex gap-2">
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleAccept(request.id)}
                                disabled={isAccepting || isRejecting}
                              >
                                Accept
                              </button>
                              <button
                                className="btn btn-sm btn-ghost"
                                onClick={() => handleReject(request.id)}
                                disabled={isAccepting || isRejecting}
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sent Requests */}
              {sentRequests.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-base-content mb-3">
                    Sent ({sentRequests.length})
                  </h3>
                  <div className="flex flex-col gap-3">
                    {sentRequests.map((request) => {
                      const recipient = request.fellow_user_info;
                      return (
                        <div
                          key={request.id}
                          className="bg-base-200/50 rounded-xl p-4 border border-base-300"
                        >
                          <Link
                            to={`/profile/${recipient.username}`}
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                            onClick={onClose}
                          >
                            <div className="avatar">
                              <div className="w-12 h-12 rounded-full border-2 border-base-300">
                                <img
                                  src={recipient.profile_picture || '/static_img/default-pic-min.jpg'}
                                  alt={recipient.username}
                                  className="object-cover"
                                />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-base-content truncate">
                                {recipient.fullname || `@${recipient.username}`}
                              </h4>
                              <p className="text-xs text-base-content/60 truncate">
                                @{recipient.username}
                              </p>
                            </div>
                            <span className="badge badge-warning">Pending</span>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {receivedRequests.length === 0 && sentRequests.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="text-6xl mb-4">👋</div>
                  <h3 className="text-xl font-bold text-base-content mb-2">
                    No Pending Requests
                  </h3>
                  <p className="text-base-content/60">
                    You don't have any pending friend requests.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

