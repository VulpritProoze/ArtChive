import React, { useState } from 'react';
import { useAvatars, useSetPrimaryAvatar } from '@hooks/queries/use-avatar';
import AvatarPreview from './avatar-preview.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';

interface AvatarSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (avatarId: string) => void;
}

/**
 * AvatarSelectorModal Component
 * Modal for selecting and managing avatars
 */
const AvatarSelectorModal: React.FC<AvatarSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const { data: avatars, isLoading } = useAvatars();
  const { mutate: setPrimary, isPending } = useSetPrimaryAvatar();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (avatarId: string) => {
    setSelectedId(avatarId);
    if (onSelect) {
      onSelect(avatarId);
    }
  };

  const handleSetPrimary = (avatarId: string) => {
    setPrimary(avatarId, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-2xl">Select Avatar</h3>
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {isLoading && (
          <div className="flex justify-center items-center py-16">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        )}

        {!isLoading && avatars && avatars.length === 0 && (
          <div className="text-center py-16 text-base-content/60">
            <div className="text-6xl mb-4">🎭</div>
            <p className="text-lg mb-4">No avatars yet</p>
            <button
              onClick={() => window.location.href = '/avatar/create'}
              className="btn btn-primary"
            >
              Create Your First Avatar
            </button>
          </div>
        )}

        {!isLoading && avatars && avatars.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            {avatars.map((avatar) => (
              <div
                key={avatar.avatar_id}
                className={`relative ${
                  selectedId === avatar.avatar_id ? 'ring-2 ring-primary rounded-lg p-2' : ''
                }`}
              >
                <AvatarPreview
                  avatar={avatar}
                  size="lg"
                  onClick={() => handleSelect(avatar.avatar_id)}
                  showPrimaryBadge={true}
                />
                {selectedId === avatar.avatar_id && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center">
                    <FontAwesomeIcon icon={faCheck} />
                  </div>
                )}
                {!avatar.is_primary && (
                  <button
                    onClick={() => handleSetPrimary(avatar.avatar_id)}
                    disabled={isPending}
                    className="btn btn-xs btn-outline btn-primary w-full mt-2"
                  >
                    Set as Primary
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="modal-action">
          <button onClick={onClose} className="btn">
            Close
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
};

export default AvatarSelectorModal;

