import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@components/common/layout';
import { useAvatars, useDeleteAvatar, useSetPrimaryAvatar, useDuplicateAvatar } from '@hooks/queries/use-avatar';
import { useConfirmation } from '@hooks/use-confirmation';
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

const AvatarListPage: React.FC = () => {
  const navigate = useNavigate();
  const { confirm } = useConfirmation();
  const { data: avatars, isLoading, isError } = useAvatars();
  const { mutate: deleteAvatar, isPending: isDeleting } = useDeleteAvatar();
  const { mutate: setPrimary, isPending: isSettingPrimary } = useSetPrimaryAvatar();
  const { mutate: duplicateAvatar, isPending: isDuplicating } = useDuplicateAvatar();
  
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!openDropdown) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      let clickedInside = false;

      Object.keys(dropdownRefs.current).forEach((avatarId) => {
        const ref = dropdownRefs.current[avatarId];
        if (ref && ref.contains(target)) {
          clickedInside = true;
        }
      });

      if (!clickedInside) {
        setOpenDropdown(null);
      }
    }

    // Use capture phase to catch events before they bubble
    document.addEventListener('mousedown', handleClickOutside, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [openDropdown]);

  const handleDelete = async (avatarId: string, avatarName: string, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent card click
    const confirmed = await confirm({
      title: 'Delete Avatar',
      message: `Are you sure you want to delete "${avatarName}"? This action cannot be undone.`,
      variant: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });
    
    if (confirmed) {
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
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setOpenDropdown(null);
    setPrimary(avatarId);
  };

  const handleDuplicate = (avatarId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setOpenDropdown(null);
    duplicateAvatar({ avatarId });
  };

  const handleEdit = (avatarId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setOpenDropdown(null);
    navigate(`/avatar/${avatarId}/edit`);
  };

  const handlePreview = (avatarId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setOpenDropdown(null);
    setPreviewAvatar(avatarId);
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
            {/* <div className="stats shadow mb-6 border border-base-300">
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
            </div> */}

            {/* Avatar Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {avatars.map((avatar) => {
                // Prioritize thumbnail over rendered_image
                const imageSrc = avatar.thumbnail || avatar.rendered_image;
                
                // Generate a consistent color based on avatar ID
                const getPlaceholderColor = (avatarId: string): string => {
                  let hash = 0;
                  for (let i = 0; i < avatarId.length; i++) {
                    hash = avatarId.charCodeAt(i) + ((hash << 5) - hash);
                  }
                  const hue = Math.abs(hash % 360);
                  const saturation = 60 + (Math.abs(hash) % 20);
                  const lightness = 50 + (Math.abs(hash) % 15);
                  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                };
                
                const placeholderColor = getPlaceholderColor(avatar.avatar_id);
                
                return (
                <div
                  key={avatar.avatar_id}
                  onClick={() => handleCardClick(avatar.avatar_id)}
                  className="card bg-base-200 border border-base-300 hover:border-primary transition-all duration-300 group hover:shadow-xl cursor-pointer"
                >
                  <figure 
                    className="px-6 pt-6 bg-base-100 rounded-lg flex items-center justify-center min-h-[16rem] transition-all duration-300 group-hover:bg-base-200" 
                    style={{ 
                      aspectRatio: '1 / 1',
                      backgroundColor: !imageSrc ? placeholderColor : undefined
                    }}
                  >
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={avatar.name}
                        className="rounded-lg w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-white/80 py-8">
                        <div className="text-6xl mb-2">👤</div>
                        <p className="text-sm font-medium">No Image</p>
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
                      <div 
                        className="relative"
                        ref={(el) => {
                          dropdownRefs.current[avatar.avatar_id] = el;
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-circle"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdown(openDropdown === avatar.avatar_id ? null : avatar.avatar_id);
                          }}
                          aria-label="More options"
                        >
                          <FontAwesomeIcon icon={faEllipsisV} />
                        </button>
                        {openDropdown === avatar.avatar_id && (
                          <ul
                            className="absolute right-0 mt-2 w-52 shadow-lg bg-base-100 rounded-box p-2 border border-base-300 z-50 menu"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <li>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handlePreview(avatar.avatar_id, e);
                                }}
                                className="w-full"
                              >
                                <FontAwesomeIcon icon={faEye} />
                                Preview
                              </button>
                            </li>
                            <li>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleEdit(avatar.avatar_id, e);
                                }}
                                className="w-full"
                              >
                                <FontAwesomeIcon icon={faEdit} />
                                Edit
                              </button>
                            </li>
                            {!avatar.is_primary && (
                              <li>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSetPrimary(avatar.avatar_id, e);
                                  }}
                                  disabled={isSettingPrimary}
                                  className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <FontAwesomeIcon icon={faStar} />
                                  Set as Primary
                                  {isSettingPrimary && <span className="loading loading-spinner loading-xs ml-2"></span>}
                                </button>
                              </li>
                            )}
                            <li>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDuplicate(avatar.avatar_id, e);
                                }}
                                disabled={isDuplicating}
                                className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <FontAwesomeIcon icon={faCopy} />
                                Duplicate
                                {isDuplicating && <span className="loading loading-spinner loading-xs ml-2"></span>}
                              </button>
                            </li>
                            <li className="border-t border-base-300 my-1"></li>
                            <li>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDelete(avatar.avatar_id, avatar.name, e);
                                }}
                                disabled={isDeleting}
                                className="w-full text-error hover:bg-error hover:text-error-content disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                                Delete
                                {isDeleting && <span className="loading loading-spinner loading-xs ml-2"></span>}
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
          <>
            {/* Enhanced Backdrop with Animation */}
            <div className="modal modal-open animate-fade-in z-[100]">
              <div
                className="fixed inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70 backdrop-blur-lg transition-all duration-300"
                onClick={() => setPreviewAvatar(null)}
              ></div>

              {/* Enhanced Modal Content with Scale Animation */}
              <div className="modal-box max-w-2xl p-0 overflow-hidden relative bg-base-100 rounded-3xl shadow-2xl animate-scale-in border border-base-300/50">
                {/* Modern Top Bar with Gradient */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-base-300 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 backdrop-blur-sm">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {avatars?.find(a => a.avatar_id === previewAvatar)?.name || 'Avatar Preview'}
                  </h3>
                  <button
                    onClick={() => setPreviewAvatar(null)}
                    className="btn btn-circle btn-ghost btn-sm hover:bg-error/10 hover:text-error transition-all duration-200 hover:rotate-90"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="px-6 py-6">

              {(() => {
                const avatar = avatars?.find(a => a.avatar_id === previewAvatar);
                if (!avatar) return null;

                // Prioritize thumbnail over rendered_image
                const imageSrc = avatar.thumbnail || avatar.rendered_image;
                
                // Generate placeholder color
                const getPlaceholderColor = (avatarId: string): string => {
                  let hash = 0;
                  for (let i = 0; i < avatarId.length; i++) {
                    hash = avatarId.charCodeAt(i) + ((hash << 5) - hash);
                  }
                  const hue = Math.abs(hash % 360);
                  const saturation = 60 + (Math.abs(hash) % 20);
                  const lightness = 50 + (Math.abs(hash) % 15);
                  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                };
                
                const placeholderColor = getPlaceholderColor(avatar.avatar_id);

                return (
                  <div className="space-y-4">
                    {/* Large Preview */}
                    <div 
                      className="bg-base-200 rounded-xl p-6 flex items-center justify-center border border-base-300" 
                      style={{ 
                        aspectRatio: '1 / 1',
                        backgroundColor: !imageSrc ? placeholderColor : undefined
                      }}
                    >
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt={avatar.name}
                          className="rounded-lg w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-center text-white/80">
                          <div className="text-6xl mb-4">👤</div>
                          <p className="text-lg font-medium">No Image</p>
                          <p className="text-sm mt-2">Edit this avatar to generate a thumbnail</p>
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
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-base-300">
                    <button
                      onClick={async () => {
                        const confirmed = await confirm({
                          title: 'Delete Avatar',
                          message: `Are you sure you want to delete "${avatar.name}"? This action cannot be undone.`,
                          variant: 'danger',
                          confirmText: 'Delete',
                          cancelText: 'Cancel',
                        });
                        if (confirmed) {
                          handleDelete(avatar.avatar_id, avatar.name);
                          setPreviewAvatar(null);
                        }
                      }}
                      className="btn btn-error btn-sm gap-2"
                      disabled={isDeleting}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                    <button
                      onClick={() => {
                        setPreviewAvatar(null);
                        handleEdit(avatar.avatar_id);
                      }}
                      className="btn btn-primary btn-sm gap-2"
                    >
                      <FontAwesomeIcon icon={faEdit} />
                      Edit Avatar
                    </button>
                    <button 
                      onClick={() => setPreviewAvatar(null)} 
                      className="btn btn-outline btn-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            })()}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default AvatarListPage;
