import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faEllipsisH, faUserMinus, faBan, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@context/auth-context';
import { useFellows, usePendingFriendRequests } from '@hooks/queries/use-fellows';
import { useCreateFriendRequest, useUnfriend, useBlockUser, useAcceptFriendRequest, useRejectFriendRequest } from '@hooks/mutations/use-fellow-mutations';
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
  const { data: fellows } = useFellows();
  const { data: pendingRequests } = usePendingFriendRequests();
  const { mutateAsync: createRequest, isPending: isCreating } = useCreateFriendRequest();
  const { mutateAsync: unfriend, isPending: isUnfriending } = useUnfriend();
  const { mutateAsync: blockUser } = useBlockUser();
  const { mutateAsync: acceptRequest, isPending: isAccepting } = useAcceptFriendRequest();
  const { mutateAsync: rejectRequest, isPending: isRejecting } = useRejectFriendRequest();

  const [relationshipStatus, setRelationshipStatus] = useState<
    'none' | 'pending-sent' | 'pending-received' | 'accepted'
  >('none');
  const [relationshipId, setRelationshipId] = useState<number | null>(null);

  // Determine relationship status
  useEffect(() => {
    if (!currentUser || !profileUser || !fellows || !pendingRequests) {
      setRelationshipStatus('none');
      setRelationshipId(null);
      return;
    }

    // Check if already friends (accepted)
    const acceptedRelationship = fellows.find(
      (f) =>
        (f.user === currentUser.id && f.fellow_user === profileUser.id) ||
        (f.fellow_user === currentUser.id && f.user === profileUser.id)
    );
    if (acceptedRelationship && acceptedRelationship.status === 'accepted') {
      setRelationshipStatus('accepted');
      setRelationshipId(acceptedRelationship.id);
      return;
    }

    // Check pending requests
    const pendingSent = pendingRequests.find(
      (req) => req.user === currentUser.id && req.fellow_user === profileUser.id && req.status === 'pending'
    );
    if (pendingSent) {
      setRelationshipStatus('pending-sent');
      setRelationshipId(pendingSent.id);
      return;
    }

    const pendingReceived = pendingRequests.find(
      (req) => req.fellow_user === currentUser.id && req.user === profileUser.id && req.status === 'pending'
    );
    if (pendingReceived) {
      setRelationshipStatus('pending-received');
      setRelationshipId(pendingReceived.id);
      return;
    }

    setRelationshipStatus('none');
    setRelationshipId(null);
  }, [currentUser, profileUser, fellows, pendingRequests]);

  const handleAddFellow = async () => {
    if (!profileUser) return;
    const userDisplayName = profileUser.fullname || `@${profileUser.username}`;
    if (!window.confirm(`Are you sure you want to send a friend request to ${userDisplayName}?`)) {
      return;
    }
    try {
      await createRequest({ fellow_user_id: profileUser.id });
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
      await acceptRequest(relationshipId);
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
      await rejectRequest(relationshipId);
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
        disabled={isCreating}
      >
        <FontAwesomeIcon icon={faUserPlus} />
        {isCreating ? 'Sending...' : 'Add as Fellow'}
      </button>
    );
  }

  if (relationshipStatus === 'pending-sent') {
    return (
      <button className="btn btn-sm btn-outline gap-2" disabled>
        <FontAwesomeIcon icon={faUserPlus} />
        Pending
      </button>
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
        >
          <FontAwesomeIcon icon={faUserPlus} />
          Request Received
        </button>

        {dropdownOpen === `pending-received-${profileUser.id}` && (
          <ul className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-48 border border-base-300 z-50">
            <li>
              <button
                className="text-sm flex items-center gap-2 text-success"
                onClick={handleAcceptRequest}
                disabled={isAccepting || isRejecting}
              >
                <FontAwesomeIcon icon={faCheck} />
                {isAccepting ? 'Accepting...' : 'Accept'}
              </button>
            </li>
            <li>
              <button
                className="text-sm flex items-center gap-2 text-error"
                onClick={handleRejectRequest}
                disabled={isAccepting || isRejecting}
              >
                <FontAwesomeIcon icon={faTimes} />
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
        >
          <FontAwesomeIcon icon={faEllipsisH} />
          Friends
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

