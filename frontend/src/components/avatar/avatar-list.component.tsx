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
  faEllipsisV,
  faEye
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
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);

  const handleDelete = (avatarId: string, avatarName: string, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent card click
    if (window.confirm(`Are you sure you want to delete "${avatarName}"?`)) {
      deleteAvatar(avatarId, {
        onSuccess: () => {
          setOpenDropdown(null);
          // Close preview modal if deleting the previewed avatar
          if (previewAvatar === avatarId) {
            setPreviewAvatar(null);
          }
        },
      });
    }
  };

  const handleSetPrimary = (avatarId: string, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent card click
    setPrimary(avatarId);
    setOpenDropdown(null);
  };

  const handleDuplicate = (avatarId: string, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent card click
    duplicateAvatar({ avatarId });
    setOpenDropdown(null);
  };

  const handleEdit = (avatarId: string, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent card click
    navigate(`/avatar/${avatarId}/edit`);
  };

  const handlePreview = (avatarId: string, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent card click
    setPreviewAvatar(avatarId);
    setOpenDropdown(null);
  };

  const handleCardClick = (avatarId: string) => {
    // Clicking card opens preview
    setPreviewAvatar(avatarId);
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
              {avatars.map((avatar) => {
                // Extract saved avatarOptions from canvas_json
                // The structure should be: canvas_json.avatarOptions
                const canvasJson = avatar.canvas_json as any;
                const savedOptions = canvasJson?.avatarOptions as AvatarOptions | undefined;
                
                // Debug logging to help troubleshoot
                if (!savedOptions && canvasJson) {
                  console.warn('Avatar has canvas_json but no avatarOptions:', avatar.name, canvasJson);
                }
                
                return (
                <div
                  key={avatar.avatar_id}
                  onClick={() => handleCardClick(avatar.avatar_id)}
                  className="card bg-base-200 border border-base-300 hover:border-primary transition-all duration-300 group hover:shadow-xl cursor-pointer"
                >
                  <figure className="px-6 pt-6 bg-base-100 rounded-lg flex items-center justify-center min-h-[16rem] transition-all duration-300 group-hover:bg-base-200" style={{ aspectRatio: '1 / 1' }}>
                    {savedOptions ? (
                      // Always render from saved avatarOptions - this shows the actual design the user created
                      <div className="w-full h-full flex items-center justify-center transition-transform duration-300 group-hover:scale-105 p-4">
                        <AvatarRenderer
                          options={savedOptions}
                          size={256}
                          className="rounded-lg w-full h-full"
                        />
                      </div>
                    ) : avatar.rendered_image || avatar.thumbnail ? (
                      // Fallback to rendered image if no options saved
                      <img
                        src={avatar.thumbnail || avatar.rendered_image}
                        alt={avatar.name}
                        className="rounded-lg w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      // No preview available - show placeholder
                      <div className="flex flex-col items-center justify-center text-base-content/30 py-8">
                        <div className="text-6xl mb-2">🎭</div>
                        <p className="text-sm">No Preview</p>
                        <p className="text-xs mt-2 text-base-content/40">Edit to see preview</p>
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdown(openDropdown === avatar.avatar_id ? null : avatar.avatar_id);
                          }}
                        >
                          <FontAwesomeIcon icon={faEllipsisV} />
                        </label>
                        {openDropdown === avatar.avatar_id && (
                          <ul
                            tabIndex={0}
                            className="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-300 z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <li>
                              <button onClick={(e) => handlePreview(avatar.avatar_id, e)}>
                                <FontAwesomeIcon icon={faEye} />
                                Preview
                              </button>
                            </li>
                            <li>
                              <button onClick={(e) => handleEdit(avatar.avatar_id, e)}>
                                <FontAwesomeIcon icon={faEdit} />
                                Edit
                              </button>
                            </li>
                            {!avatar.is_primary && (
                              <li>
                                <button
                                  onClick={(e) => handleSetPrimary(avatar.avatar_id, e)}
                                  disabled={isSettingPrimary}
                                >
                                  <FontAwesomeIcon icon={faStar} />
                                  Set as Primary
                                </button>
                              </li>
                            )}
                            <li>
                              <button
                                onClick={(e) => handleDuplicate(avatar.avatar_id, e)}
                                disabled={isDuplicating}
                              >
                                <FontAwesomeIcon icon={faCopy} />
                                Duplicate
                              </button>
                            </li>
                            <li className="border-t border-base-300 my-1"></li>
                            <li>
                              <button
                                onClick={(e) => handleDelete(avatar.avatar_id, avatar.name, e)}
                                disabled={isDeleting}
                                className="text-error hover:bg-error hover:text-error-content"
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
                );
              })}
            </div>
          </>
        )}

        {/* Preview Modal */}
        {previewAvatar && (
          <div className="modal modal-open">
            <div className="modal-box max-w-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-2xl">
                  {avatars?.find(a => a.avatar_id === previewAvatar)?.name || 'Avatar Preview'}
                </h3>
                <button
                  onClick={() => setPreviewAvatar(null)}
                  className="btn btn-sm btn-circle btn-ghost"
                >
                  ✕
                </button>
              </div>

              {(() => {
                const avatar = avatars?.find(a => a.avatar_id === previewAvatar);
                if (!avatar) return null;

                // Get saved avatarOptions from canvas_json
                const canvasJson = avatar.canvas_json as any;
                const savedOptions = canvasJson?.avatarOptions as AvatarOptions | undefined;

                return (
                  <div className="space-y-4">
                    {/* Large Preview */}
                    <div className="bg-base-200 rounded-xl p-6 flex items-center justify-center border border-base-300" style={{ aspectRatio: '1 / 1' }}>
                      {savedOptions ? (
                        // Always prefer rendering from saved options to show actual design
                        <AvatarRenderer
                          options={savedOptions}
                          size={400}
                          className="rounded-lg w-full h-full"
                        />
                      ) : avatar.rendered_image || avatar.thumbnail ? (
                        <img
                          src={avatar.thumbnail || avatar.rendered_image}
                          alt={avatar.name}
                          className="rounded-lg w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-center text-base-content/50">
                          <div className="text-6xl mb-4">🎭</div>
                          <p className="text-lg">No Avatar Data</p>
                          <p className="text-sm mt-2">Edit this avatar to customize it</p>
                        </div>
                      )}
                    </div>

                    {/* Avatar Details */}
                    <div className="space-y-2">
                      <div>
                        <span className="font-semibold">Name:</span> {avatar.name}
                      </div>
                      {avatar.description && (
                        <div>
                          <span className="font-semibold">Description:</span> {avatar.description}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <span className="badge badge-sm">{avatar.status}</span>
                        {avatar.is_primary && (
                          <span className="badge badge-sm badge-primary gap-1">
                            <FontAwesomeIcon icon={faStar} />
                            Primary
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="modal-action">
                      <button
                        onClick={() => {
                          setPreviewAvatar(null);
                          handleEdit(avatar.avatar_id);
                        }}
                        className="btn btn-primary gap-2"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                        Edit Avatar
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete "${avatar.name}"?`)) {
                            handleDelete(avatar.avatar_id, avatar.name);
                            setPreviewAvatar(null);
                          }
                        }}
                        className="btn btn-error gap-2"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                        Delete
                      </button>
                      <button onClick={() => setPreviewAvatar(null)} className="btn">
                        Close
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="modal-backdrop" onClick={() => setPreviewAvatar(null)}></div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AvatarListPage;
