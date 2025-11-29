import { Link } from 'react-router-dom';
import { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisH, faUserMinus, faBan } from '@fortawesome/free-solid-svg-icons';
import type { UserFellow } from '@types';
import { useAuth } from '@context/auth-context';
import { useUnfriend, useBlockUser } from '@hooks/mutations/use-fellow-mutations';
import { usePostUI } from '@context/post-ui-context';

interface FellowCardProps {
  fellow: UserFellow;
  currentUserId: number;
  showActions?: boolean;
}

export default function FellowCard({ fellow, currentUserId, showActions = true }: FellowCardProps) {
  const { user } = useAuth();
  const { dropdownOpen, setDropdownOpen } = usePostUI();
  const { mutateAsync: unfriend, isPending: isUnfriending } = useUnfriend();
  const { mutateAsync: blockUser } = useBlockUser();
  
  // Determine which user info to show (the other user in the relationship)
  const otherUser = fellow.user === currentUserId ? fellow.fellow_user_info : fellow.user_info;
  const relationshipId = fellow.id;

  const handleUnfriend = async () => {
    if (!window.confirm(`Are you sure you want to unfriend ${otherUser.fullname || otherUser.username}?`)) {
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
    // Placeholder - disabled
    try {
      await blockUser(relationshipId);
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  return (
    <div className="bg-base-100 rounded-xl border border-base-300 p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <Link
          to={`/profile/${otherUser.username}`}
          className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
        >
          <div className="avatar">
            <div className="w-12 h-12 rounded-full border-2 border-primary">
              <img
                src={otherUser.profile_picture || '/static_img/default-pic-min.jpg'}
                alt={otherUser.username}
                className="object-cover"
              />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base-content truncate text-sm">
              {otherUser.fullname || `@${otherUser.username}`}
            </h3>
            <p className="text-xs text-base-content/60 truncate">
              @{otherUser.username}
            </p>
            {otherUser.artist_types && otherUser.artist_types.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {otherUser.artist_types.slice(0, 2).map((type, index) => (
                  <span
                    key={index}
                    className="badge badge-sm badge-primary text-xs"
                  >
                    {type}
                  </span>
                ))}
                {otherUser.artist_types.length > 2 && (
                  <span className="badge badge-sm badge-ghost text-xs">
                    +{otherUser.artist_types.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </Link>

        {/* Actions Dropdown - only show if showActions is true */}
        {showActions && (
          <div className="dropdown dropdown-end">
            <button
              className="btn btn-ghost btn-sm btn-circle"
              onClick={() =>
                setDropdownOpen(dropdownOpen === `fellow-${relationshipId}` ? null : `fellow-${relationshipId}`)
              }
            >
              <FontAwesomeIcon icon={faEllipsisH} />
            </button>

            {dropdownOpen === `fellow-${relationshipId}` && (
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
        )}
      </div>
    </div>
  );
}

