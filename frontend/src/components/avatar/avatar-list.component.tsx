import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@components/common/layout';
import { useAvatars, useDeleteAvatar, useSetPrimaryAvatar, useDuplicateAvatar } from '@hooks/queries/use-avatar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faEdit, 
  faTrash, 
  faCopy, 
  faStar,
  faEllipsisV
} from '@fortawesome/free-solid-svg-icons';
import AvatarRenderer from './avatar-renderer.component';
import type { AvatarOptions } from './avatar-options';
import { defaultAvatarOptions } from './avatar-options';

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
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Simple Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Avatars</h1>
          <button
            onClick={handleCreateNew}
            className="btn btn-primary gap-2"
          >
            <FontAwesomeIcon icon={faPlus} />
            Create Avatar
          </button>
        </div>

        {/* Empty State */}
        {!avatars || avatars.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-2xl font-bold mb-2">No avatars yet</h3>
            <p className="text-base-content/60 mb-6">
              Create your first avatar to get started
            </p>
            <button
              onClick={handleCreateNew}
              className="btn btn-primary gap-2"
            >
              <FontAwesomeIcon icon={faPlus} />
              Create Your First Avatar
            </button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="stats shadow mb-6 border border-base-300">
              <div className="stat">
                <div className="stat-title">Total Avatars</div>
                <div className="stat-value text-primary">{avatars.length}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Active</div>
                <div className="stat-value text-secondary">
                  {avatars.filter((a) => a.status === 'active').length}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Drafts</div>
                <div className="stat-value text-accent">
                  {avatars.filter((a) => a.status === 'draft').length}
                </div>
              </div>
            </div>

            {/* Avatar Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {avatars.map((avatar) => (
                <div
                  key={avatar.avatar_id}
                  className="card bg-base-200 border border-base-300 hover:border-primary transition-all duration-300 group hover:shadow-xl"
                >
                  <figure className="px-6 pt-6 bg-base-100 rounded-lg flex items-center justify-center min-h-[12rem] transition-all duration-300 group-hover:bg-base-200">
                    {avatar.rendered_image || avatar.thumbnail ? (
                      <img
                        src={avatar.thumbnail || avatar.rendered_image}
                        alt={avatar.name}
                        className="rounded-lg w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : avatar.canvas_json && (avatar.canvas_json as any).avatarOptions ? (
                      <div className="w-full h-48 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                        <AvatarRenderer
                          options={(avatar.canvas_json as any).avatarOptions as AvatarOptions}
                          size={192}
                          className="rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-base-content/30 py-8">
                        <div className="text-6xl mb-2">🎭</div>
                        <p className="text-sm">No Preview</p>
                      </div>
                    )}
                  </figure>
                  <div className="card-body p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h2 className="card-title text-base truncate">
                          {avatar.name}
                          {avatar.is_primary && (
                            <div className="badge badge-primary badge-sm gap-1">
                              <FontAwesomeIcon icon={faStar} />
                            </div>
                          )}
                        </h2>
                        <div className="badge badge-sm badge-ghost mt-1">{avatar.status}</div>
                      </div>
                      
                      {/* Dropdown Menu */}
                      <div className="dropdown dropdown-end">
                        <label
                          tabIndex={0}
                          className="btn btn-ghost btn-sm btn-circle"
                          onClick={() => setOpenDropdown(openDropdown === avatar.avatar_id ? null : avatar.avatar_id)}
                        >
                          <FontAwesomeIcon icon={faEllipsisV} />
                        </label>
                        {openDropdown === avatar.avatar_id && (
                          <ul
                            tabIndex={0}
                            className="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-300 z-10"
                          >
                            <li>
                              <button onClick={() => handleEdit(avatar.avatar_id)}>
                                <FontAwesomeIcon icon={faEdit} />
                                Edit
                              </button>
                            </li>
                            {!avatar.is_primary && (
                              <li>
                                <button
                                  onClick={() => handleSetPrimary(avatar.avatar_id)}
                                  disabled={isSettingPrimary}
                                >
                                  <FontAwesomeIcon icon={faStar} />
                                  Set as Primary
                                </button>
                              </li>
                            )}
                            <li>
                              <button
                                onClick={() => handleDuplicate(avatar.avatar_id)}
                                disabled={isDuplicating}
                              >
                                <FontAwesomeIcon icon={faCopy} />
                                Duplicate
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => handleDelete(avatar.avatar_id, avatar.name)}
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
                    
                    {avatar.description && (
                      <p className="text-sm text-base-content/60 line-clamp-2 mt-2">
                        {avatar.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default AvatarListPage;
