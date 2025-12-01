import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAvatars } from '@hooks/queries/use-avatar';
import { Avatar } from '@services/avatar.service';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faStar } from '@fortawesome/free-solid-svg-icons';

interface AvatarTabContentProps {
  userId?: number;
  isOwnProfile: boolean;
}

const AvatarTabContent: React.FC<AvatarTabContentProps> = ({ isOwnProfile }) => {
  const navigate = useNavigate();
  const { data: avatars, isLoading } = useAvatars();

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
          {isOwnProfile ? 'No Avatars Yet' : 'No Public Avatars'}
        </h3>
        <p className="text-base-content/60 text-center max-w-md mb-6">
          {isOwnProfile
            ? 'Create your first custom avatar using our canvas editor!'
            : 'This user hasn\'t created any avatars yet.'}
        </p>
        {isOwnProfile && (
          <button
            onClick={() => navigate('/avatar/create')}
            className="btn btn-primary gap-2"
          >
            <FontAwesomeIcon icon={faPlus} />
            Create Your First Avatar
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions (Own Profile Only) */}
      {isOwnProfile && (
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold">Your Avatars</h3>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/avatar')}
              className="btn btn-sm btn-outline"
            >
              Manage All
            </button>
            <button
              onClick={() => navigate('/avatar/create')}
              className="btn btn-sm btn-primary gap-2"
            >
              <FontAwesomeIcon icon={faPlus} />
              Create New
            </button>
          </div>
        </div>
      )}

      {/* Avatar Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {avatars.map((avatar: Avatar) => (
          <div
            key={avatar.avatar_id}
            className={`card bg-base-200 shadow-xl hover:shadow-2xl transition-all cursor-pointer ${
              avatar.is_primary ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => isOwnProfile && navigate(`/avatar/${avatar.avatar_id}/edit`)}
          >
            {/* Avatar Image */}
            <figure className="bg-base-300 h-48 relative">
              {avatar.rendered_image ? (
                <img
                  src={avatar.rendered_image}
                  alt={avatar.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-base-content/30">
                  <div className="text-6xl">🎭</div>
                </div>
              )}
              
              {/* Primary Badge */}
              {avatar.is_primary && (
                <div className="absolute top-2 left-2 badge badge-primary badge-sm gap-1">
                  <FontAwesomeIcon icon={faStar} className="text-xs" />
                  Primary
                </div>
              )}
            </figure>

            {/* Card Body */}
            <div className="card-body p-4">
              <h3 className="font-semibold text-sm truncate">{avatar.name}</h3>
              <div className="badge badge-sm badge-ghost">{avatar.status}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AvatarTabContent;

