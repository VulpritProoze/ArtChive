import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faEllipsisH, faUserMinus, faBan, faCheck, faTimes, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@context/auth-context';
import { useCheckFriendRequestStatus } from '@hooks/queries/use-fellows';
import { useCreateFriendRequest, useUnfriend, useBlockUser, useAcceptFriendRequest, useRejectFriendRequest, useCancelFriendRequest } from '@hooks/mutations/use-fellow-mutations';
import { usePostUI } from '@context/post-ui-context';
// Type matching the return from useUserProfile hook (UserProfilePublicSerializer)
interface UserProfilePublic {
  id: number;
  username: string;
  fullname: string;
  profile_picture: string | null;
  artist_types: string[];
}

interface AddFellowButtonProps {
  profileUser: UserProfilePublic | undefined;
}

export default function AddFellowButton({ profileUser }: AddFellowButtonProps) {
  const { user: currentUser } = useAuth();
  const { dropdownOpen, setDropdownOpen } = usePostUI();
  const { data: statusData, isLoading: isLoadingStatus } = useCheckFriendRequestStatus(profileUser?.id);
  const { mutateAsync: createRequest, isPending: isCreating } = useCreateFriendRequest();
  const { mutateAsync: unfriend, isPending: isUnfriending } = useUnfriend();
  const { mutateAsync: blockUser } = useBlockUser();
  const { mutateAsync: acceptRequest, isPending: isAccepting } = useAcceptFriendRequest();
  const { mutateAsync: rejectRequest, isPending: isRejecting } = useRejectFriendRequest();
  const { mutateAsync: cancelRequest, isPending: isCancelling } = useCancelFriendRequest();

  const relationshipStatus = statusData
    ? statusData.is_friends
      ? 'accepted'
      : statusData.has_pending_received
      ? 'pending-received'
      : statusData.has_pending_sent
      ? 'pending-sent'
      : 'none'
    : 'none';
  // Use relationship_id for accepted friends, request_id for pending requests
  const relationshipId = statusData
    ? statusData.is_friends
      ? statusData.relationship_id || null
      : statusData.request_id || null
    : null;

  const handleAddFellow = async () => {
    if (!profileUser) return;
    const userDisplayName = profileUser.fullname || `@${profileUser.username}`;
    if (!window.confirm(`Are you sure you want to send a friend request to ${userDisplayName}?`)) {
      return;
    }
    try {
      await createRequest({ 
        payload: { fellow_user_id: profileUser.id },
        userId: profileUser.id 
      });
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const handleCancelRequest = async () => {
    if (!relationshipId || !profileUser) return;
    const userDisplayName = profileUser.fullname || `@${profileUser.username}`;
    if (!window.confirm(`Are you sure you want to cancel the friend request to ${userDisplayName}?`)) {
      return;
    }
    try {
      await cancelRequest({ requestId: relationshipId, userId: profileUser.id });
      setDropdownOpen(null);
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const handleUnfriend = async () => {
    if (!relationshipId) return;
    if (!window.confirm(`Are you sure you want to unfriend ${profileUser?.fullname || profileUser?.username}?`)) {
      return;
    }
    try {
      await unfriend(relationshipId);
      setDropdownOpen(null);
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const handleBlock = async () => {
    if (!relationshipId) return;
    // Placeholder - disabled
    try {
      await blockUser(relationshipId);
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const handleAcceptRequest = async () => {
    if (!relationshipId || !profileUser) return;
    const userDisplayName = profileUser.fullname || `@${profileUser.username}`;
    if (!window.confirm(`Are you sure you want to accept the friend request from ${userDisplayName}?`)) {
      return;
    }
    try {
      await acceptRequest({ requestId: relationshipId, userId: profileUser.id });
      setDropdownOpen(null);
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const handleRejectRequest = async () => {
    if (!relationshipId || !profileUser) return;
    const userDisplayName = profileUser.fullname || `@${profileUser.username}`;
    if (!window.confirm(`Are you sure you want to reject the friend request from ${userDisplayName}?`)) {
      return;
    }
    try {
      await rejectRequest({ requestId: relationshipId, userId: profileUser.id });
      setDropdownOpen(null);
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  // Don't show button if viewing own profile
  if (!currentUser || !profileUser || currentUser.id === profileUser.id) {
    return null;
  }

  // Show appropriate button based on relationship status
  if (relationshipStatus === 'none') {
    return (
      <button
        className="btn btn-sm btn-primary gap-2"
        onClick={handleAddFellow}
        disabled={isCreating || isLoadingStatus}
      >
        {isLoadingStatus || isCreating ? (
          <span className="loading loading-spinner loading-xs"></span>
        ) : (
          <FontAwesomeIcon icon={faUserPlus} />
        )}
        {isLoadingStatus ? 'Loading...' : isCreating ? 'Sending...' : 'Add as Fellow'}
      </button>
    );
  }

  if (relationshipStatus === 'pending-sent') {
    return (
      <div className="dropdown dropdown-end">
        <button
          className="btn btn-sm btn-outline gap-2"
          onClick={() =>
            setDropdownOpen(dropdownOpen === `pending-sent-${profileUser.id}` ? null : `pending-sent-${profileUser.id}`)
          }
          disabled={isCancelling || isLoadingStatus}
        >
          {isLoadingStatus || isCancelling ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <FontAwesomeIcon icon={faUserPlus} />
          )}
          {isLoadingStatus ? 'Loading...' : isCancelling ? 'Cancelling...' : 'Pending'}
        </button>

        {dropdownOpen === `pending-sent-${profileUser.id}` && (
          <ul className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-48 border border-base-300 z-50">
            <li>
              <button
                className="text-sm flex items-center gap-2 text-error"
                onClick={handleCancelRequest}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <FontAwesomeIcon icon={faXmark} />
                )}
                {isCancelling ? 'Cancelling...' : 'Cancel Request'}
              </button>
            </li>
          </ul>
        )}
      </div>
    );
  }

  if (relationshipStatus === 'pending-received') {
    return (
      <div className="dropdown dropdown-end">
        <button
          className="btn btn-sm btn-outline gap-2"
          onClick={() =>
            setDropdownOpen(dropdownOpen === `pending-received-${profileUser.id}` ? null : `pending-received-${profileUser.id}`)
          }
          disabled={isLoadingStatus || isAccepting || isRejecting}
        >
          {isLoadingStatus || isAccepting || isRejecting ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <FontAwesomeIcon icon={faUserPlus} />
          )}
          {isLoadingStatus ? 'Loading...' : isRejecting ? 'Rejecting...' : isAccepting ? 'Accepting...' : 'Request Received'}
        </button>

        {dropdownOpen === `pending-received-${profileUser.id}` && (
          <ul className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-48 border border-base-300 z-50">
            <li>
              <button
                className="text-sm flex items-center gap-2 text-success"
                onClick={handleAcceptRequest}
                disabled={isAccepting || isRejecting}
              >
                {isAccepting ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <FontAwesomeIcon icon={faCheck} />
                )}
                {isAccepting ? 'Accepting...' : 'Accept'}
              </button>
            </li>
            <li>
              <button
                className="text-sm flex items-center gap-2 text-error"
                onClick={handleRejectRequest}
                disabled={isAccepting || isRejecting}
              >
                {isRejecting ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <FontAwesomeIcon icon={faTimes} />
                )}
                {isRejecting ? 'Rejecting...' : 'Reject'}
              </button>
            </li>
          </ul>
        )}
      </div>
    );
  }

  if (relationshipStatus === 'accepted') {
    return (
      <div className="dropdown dropdown-end">
        <button
          className="btn btn-sm btn-outline gap-2"
          onClick={() =>
            setDropdownOpen(dropdownOpen === `add-fellow-${profileUser.id}` ? null : `add-fellow-${profileUser.id}`)
          }
          disabled={isLoadingStatus || isUnfriending}
        >
          {isLoadingStatus ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <FontAwesomeIcon icon={faEllipsisH} />
          )}
          {isLoadingStatus ? 'Loading...' : 'Friends'}
        </button>

        {dropdownOpen === `add-fellow-${profileUser.id}` && (
          <ul className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-48 border border-base-300 z-50">
            <li>
              <button
                className="text-sm flex items-center gap-2 text-error"
                onClick={handleUnfriend}
                disabled={isUnfriending}
              >
                <FontAwesomeIcon icon={faUserMinus} />
                {isUnfriending ? 'Unfriending...' : 'Unfriend'}
              </button>
            </li>
            <li>
              <button
                className="text-sm flex items-center gap-2 text-base-content/50 cursor-not-allowed"
                onClick={handleBlock}
                disabled
                title="Block feature is not yet implemented"
              >
                <FontAwesomeIcon icon={faBan} />
                Block
              </button>
            </li>
          </ul>
        )}
      </div>
    );
  }

  return null;
}

