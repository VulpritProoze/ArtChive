import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@components/common/layout';
import { useAvatars, useDeleteAvatar, useSetPrimaryAvatar, useDuplicateAvatar } from '@hooks/queries/use-avatar';
import { Avatar } from '@services/avatar.service';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faEdit, 
  faTrash, 
  faCopy, 
  faStar,
  faEllipsisV
} from '@fortawesome/free-solid-svg-icons';

const AvatarListPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: avatars, isLoading, isError } = useAvatars();
  const { mutate: deleteAvatar, isPending: isDeleting } = useDeleteAvatar();
  const { mutate: setPrimary, isPending: isSettingPrimary } = useSetPrimaryAvatar();
  const { mutate: duplicateAvatar, isPending: isDuplicating } = useDuplicateAvatar();
  
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const handleDelete = (avatarId: string, avatarName: string) => {
    if (window.confirm(`Are you sure you want to delete "${avatarName}"?`)) {
      deleteAvatar(avatarId);
    }
  };

  const handleSetPrimary = (avatarId: string) => {
    setPrimary(avatarId);
  };

  const handleDuplicate = (avatarId: string) => {
    duplicateAvatar({ avatarId });
  };

  const handleEdit = (avatarId: string) => {
    navigate(`/avatar/${avatarId}/edit`);
  };

  const handleCreateNew = () => {
    navigate('/avatar/create');
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-screen">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </MainLayout>
    );
  }

  if (isError) {
    return (
      <MainLayout>
        <div className="alert alert-error">
          <span>Error loading avatars. Please try again later.</span>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              My Avatars
            </h1>
            <p className="text-base-content/60 mt-2">
              Create and manage your custom avatars
            </p>
          </div>
          <button
            onClick={handleCreateNew}
            className="btn btn-primary gap-2"
          >
            <FontAwesomeIcon icon={faPlus} />
            Create New Avatar
          </button>
        </div>

        {/* Empty State */}
        {avatars && avatars.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-8xl mb-4">🎨</div>
            <h3 className="text-2xl font-bold text-base-content mb-2">
              No Avatars Yet
            </h3>
            <p className="text-base-content/60 text-center max-w-md mb-6">
              Create your first custom avatar using our canvas editor!
            </p>
            <button
              onClick={handleCreateNew}
              className="btn btn-primary gap-2"
            >
              <FontAwesomeIcon icon={faPlus} />
              Create Your First Avatar
            </button>
          </div>
        )}

        {/* Avatar Grid */}
        {avatars && avatars.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {avatars.map((avatar: Avatar) => (
              <div
                key={avatar.avatar_id}
                className={`card bg-base-200 shadow-xl hover:shadow-2xl transition-all duration-300 ${
                  avatar.is_primary ? 'ring-2 ring-primary' : ''
                }`}
              >
                {/* Avatar Image */}
                <figure className="bg-base-300 h-64 relative">
                  {avatar.rendered_image ? (
                    <img
                      src={avatar.rendered_image}
                      alt={avatar.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-base-content/30">
                      <div className="text-center">
                        <div className="text-6xl mb-2">🎭</div>
                        <p className="text-sm">No Preview</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Primary Badge */}
                  {avatar.is_primary && (
                    <div className="absolute top-2 left-2 badge badge-primary gap-1">
                      <FontAwesomeIcon icon={faStar} className="text-xs" />
                      Primary
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className={`absolute top-2 right-2 badge ${
                    avatar.status === 'active' ? 'badge-success' :
                    avatar.status === 'draft' ? 'badge-warning' :
                    'badge-ghost'
                  }`}>
                    {avatar.status}
                  </div>
                </figure>

                {/* Card Body */}
                <div className="card-body">
                  <h2 className="card-title text-lg">
                    {avatar.name}
                    {avatar.is_primary && (
                      <FontAwesomeIcon icon={faStar} className="text-primary text-sm" />
                    )}
                  </h2>
                  
                  {avatar.description && (
                    <p className="text-sm text-base-content/70 line-clamp-2">
                      {avatar.description}
                    </p>
                  )}

                  <div className="card-actions justify-between items-center mt-4">
                    {/* Edit Button */}
                    <button
                      onClick={() => handleEdit(avatar.avatar_id)}
                      className="btn btn-sm btn-primary"
                    >
                      <FontAwesomeIcon icon={faEdit} />
                      Edit
                    </button>

                    {/* Dropdown Menu */}
                    <div className="dropdown dropdown-end">
                      <button
                        tabIndex={0}
                        className="btn btn-sm btn-ghost btn-circle"
                        onClick={() => setOpenDropdown(
                          openDropdown === avatar.avatar_id ? null : avatar.avatar_id
                        )}
                      >
                        <FontAwesomeIcon icon={faEllipsisV} />
                      </button>
                      {openDropdown === avatar.avatar_id && (
                        <ul
                          tabIndex={0}
                          className="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-box w-52 z-10"
                        >
                          {!avatar.is_primary && (
                            <li>
                              <button
                                onClick={() => {
                                  handleSetPrimary(avatar.avatar_id);
                                  setOpenDropdown(null);
                                }}
                                disabled={isSettingPrimary}
                              >
                                <FontAwesomeIcon icon={faStar} />
                                Set as Primary
                              </button>
                            </li>
                          )}
                          <li>
                            <button
                              onClick={() => {
                                handleDuplicate(avatar.avatar_id);
                                setOpenDropdown(null);
                              }}
                              disabled={isDuplicating}
                            >
                              <FontAwesomeIcon icon={faCopy} />
                              Duplicate
                            </button>
                          </li>
                          <li>
                            <button
                              onClick={() => {
                                handleDelete(avatar.avatar_id, avatar.name);
                                setOpenDropdown(null);
                              }}
                              disabled={isDeleting}
                              className="text-error"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                              Delete
                            </button>
                          </li>
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AvatarListPage;

