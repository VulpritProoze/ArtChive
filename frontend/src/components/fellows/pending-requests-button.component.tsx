import { useState, useRef, useEffect } from 'react';
import { UserPlus2, Check, X as XIcon, Users } from 'lucide-react';
import { useFriendRequestCount, usePendingFriendRequests } from '@hooks/queries/use-fellows';
import { useAcceptFriendRequest, useRejectFriendRequest } from '@hooks/mutations/use-fellow-mutations';
import { useAuth } from '@context/auth-context';
import { Link, useNavigate } from 'react-router-dom';
import { SimpleLoadingSpinner } from '@components/loading-spinner';

interface PendingFriendRequestsButtonProps {
  isMobile?: boolean;
}

export default function PendingFriendRequestsButton({ isMobile = false }: PendingFriendRequestsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: countData, isLoading: isLoadingCount } = useFriendRequestCount();
  const { data: requests, isLoading: isLoadingRequests } = usePendingFriendRequests();
  const { mutateAsync: acceptRequest, isPending: isAccepting } = useAcceptFriendRequest();
  const { mutateAsync: rejectRequest, isPending: isRejecting } = useRejectFriendRequest();

  const totalCount = countData?.received_count || 0; // Only show received count in modal

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Separate received and sent requests
  const receivedRequests = requests?.filter(
    (req) => req.fellow_user === user?.id && req.status === 'pending'
  ) || [];

  const handleAccept = async (e: React.MouseEvent, requestId: number) => {
    e.stopPropagation();
    e.preventDefault();
    
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
    
    setProcessingRequestId(requestId);
    try {
      await acceptRequest({ requestId, userId: requesterUserId });
    } catch (error) {
      // Error handled by mutation hook
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleReject = async (e: React.MouseEvent, requestId: number) => {
    e.stopPropagation();
    e.preventDefault();
    setProcessingRequestId(requestId);
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
    } finally {
      setProcessingRequestId(null);
    }
  };

  // Close dropdown when there are no more received requests
  useEffect(() => {
    if (isOpen && receivedRequests.length === 0 && !isLoadingRequests) {
      setIsOpen(false);
    }
  }, [isOpen, receivedRequests.length, isLoadingRequests]);

  if (isLoadingCount) {
    return (
      <button
        className="btn btn-ghost btn-circle btn-sm hover:bg-base-200 relative"
        title="Loading..."
        disabled
      >
        <UserPlus2 className="w-5 h-5 flex-shrink-0" />
      </button>
    );
  }

  // On mobile, just navigate to the page
  if (isMobile) {
    return (
      <button
        className="btn btn-ghost btn-circle btn-sm hover:bg-base-200 relative"
        title="Friend Requests"
        onClick={() => navigate('/fellows/requests')}
      >
        <UserPlus2 className="w-5 h-5 flex-shrink-0" />
        {totalCount > 0 && (
          <span className="absolute -top-[9px] -right-1 w-5 h-5 bg-error text-error-content text-xs font-bold rounded-full flex items-center justify-center">
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="btn btn-ghost btn-circle btn-sm hover:bg-base-200 relative"
        title="Friend Requests"
        onClick={() => setIsOpen(!isOpen)}
      >
        <UserPlus2 className="w-5 h-5 flex-shrink-0" />
        {totalCount > 0 && (
          <span className="absolute -top-[7px] -right-1 w-5 h-5 bg-error text-error-content text-xs font-bold rounded-full flex items-center justify-center">
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-base-100 rounded-xl shadow-2xl border border-base-300 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-base-300">
            <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
              <Users className="w-5 h-5 flex-shrink-0" />
              Friend Requests
            </h3>
            <div className="flex gap-2">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/fellows/requests');
                }}
              >
                View All
              </button>
              <button
                className="btn btn-ghost btn-sm btn-circle"
                onClick={() => setIsOpen(false)}
              >
                <XIcon className="w-4 h-4 flex-shrink-0" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoadingRequests ? (
              <div className="flex justify-center items-center py-8">
                <SimpleLoadingSpinner text="Loading..." spinnerSize="sm" />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Only Received Requests in Modal */}
                {receivedRequests.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {receivedRequests.map((request) => {
                      const requester = request.user_info;
                      return (
                        <div
                          key={request.id}
                          className="bg-base-200/50 rounded-lg p-3 border border-base-300"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Link
                              to={`/profile/@${requester.username}`}  // DO NOT MODIFY THE '@'!!!!!!
                              className="flex items-center gap-2 flex-1 hover:opacity-80 transition-opacity min-w-0"
                              onClick={() => setIsOpen(false)}
                            >
                              <div className="avatar">
                                <div className="w-10 h-10 rounded-full border-2 border-primary">
                                  <img
                                    src={requester.profile_picture || '/static_img/default-pic-min.jpg'}
                                    alt={requester.username}
                                    className="object-cover"
                                  />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-base-content truncate">
                                  {requester.fullname || `@${requester.username}`}
                                </p>
                                <p className="text-xs text-base-content/60 truncate">
                                  @{requester.username}
                                </p>
                              </div>
                            </Link>
                            <div className="flex gap-1">
                              <button
                                className="btn btn-xs btn-primary"
                                onClick={(e) => handleAccept(e, request.id)}
                                disabled={processingRequestId !== null}
                                title="Accept"
                              >
                                {processingRequestId === request.id && isAccepting ? (
                                  <span className="loading loading-spinner loading-xs"></span>
                                ) : (
                                  <Check className="w-3 h-3 flex-shrink-0" />
                                )}
                              </button>
                              <button
                                className="btn btn-xs btn-ghost"
                                onClick={(e) => handleReject(e, request.id)}
                                disabled={processingRequestId !== null}
                                title="Reject"
                              >
                                {processingRequestId === request.id && isRejecting ? (
                                  <span className="loading loading-spinner loading-xs"></span>
                                ) : (
                                  <XIcon className="w-3 h-3 flex-shrink-0" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Users className="w-12 h-12 text-base-content/30 mb-3" />
                    <h4 className="text-base font-semibold text-base-content mb-1">
                      No Pending Requests
                    </h4>
                    <p className="text-sm text-base-content/60">
                      You don't have any pending friend requests.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

