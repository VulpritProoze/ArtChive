import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAvatars } from '@hooks/queries/use-avatar';
import type { Avatar } from '@services/avatar.service';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import AvatarPreview from './avatar-preview.component';

interface AvatarTabContentProps {
  userId?: number;
  isOwnProfile: boolean;
}

const AvatarTabContent: React.FC<AvatarTabContentProps> = ({ isOwnProfile }) => {
  const navigate = useNavigate();
  const { data: avatars, isLoading } = useAvatars();

  // If viewing someone else's profile, show privacy message
  if (!isOwnProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-8xl mb-4">🔒</div>
        <h3 className="text-2xl font-bold text-base-content mb-2">
          Avatars Are Private
        </h3>
        <p className="text-base-content/60 text-center max-w-md mb-6">
          Avatars are private and can only be viewed by their owner. This user's avatars are not publicly visible.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card bg-base-200 shadow-xl">
            <figure className="bg-base-300 h-48 animate-pulse"></figure>
            <div className="card-body">
              <div className="h-4 bg-base-300 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!avatars || avatars.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-8xl mb-4">🎭</div>
        <h3 className="text-2xl font-bold text-base-content mb-2">
          No Avatars Yet
        </h3>
        <p className="text-base-content/60 text-center max-w-md mb-6">
          Create your first custom avatar using our canvas editor!
        </p>
        <button
          onClick={() => navigate('/avatar/create')}
          className="btn btn-primary gap-2"
        >
          <FontAwesomeIcon icon={faPlus} />
          Create Your First Avatar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions (Own Profile Only) */}
      {isOwnProfile && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-xl font-semibold">Your Avatars</h3>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={() => navigate('/avatar')}
              className="btn btn-sm btn-outline flex-1 sm:flex-none"
            >
              Manage All
            </button>
            <button
              onClick={() => navigate('/avatar/create')}
              className="btn btn-sm btn-primary gap-2 flex-1 sm:flex-none"
            >
              <FontAwesomeIcon icon={faPlus} />
              Create New
            </button>
          </div>
        </div>
      )}

      {/* Avatar Grid - Circular Preview Style */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 justify-items-center">
        {avatars.map((avatar: Avatar) => (
          <div key={avatar.avatar_id} className="w-full flex justify-center">
            <AvatarPreview
              avatar={avatar}
              size="lg"
              onClick={() => isOwnProfile && navigate(`/avatar/${avatar.avatar_id}/edit`)}
              showPrimaryBadge={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default AvatarTabContent;

