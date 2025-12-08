import React from 'react';
import type { Avatar } from '@services/avatar.service';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar } from '@fortawesome/free-solid-svg-icons';

interface AvatarPreviewProps {
  avatar: Avatar;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
  showPrimaryBadge?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-20 h-20 sm:w-24 sm:h-24',
  lg: 'w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32',
  xl: 'w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48',
};

/**
 * Generate a consistent color based on avatar ID
 */
const getPlaceholderColor = (avatarId: string): string => {
  // Generate a hash from the avatar ID
  let hash = 0;
  for (let i = 0; i < avatarId.length; i++) {
    hash = avatarId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate a color from the hash
  const hue = Math.abs(hash % 360);
  const saturation = 60 + (Math.abs(hash) % 20); // 60-80%
  const lightness = 50 + (Math.abs(hash) % 15); // 50-65%
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

/**
 * AvatarPreview Component
 * Shows a circular preview of an avatar with optional primary badge
 * Uses thumbnail image, falls back to color placeholder
 */
const AvatarPreview: React.FC<AvatarPreviewProps> = ({
  avatar,
  size = 'md',
  onClick,
  showPrimaryBadge = true,
  className = '',
}) => {
  // Prioritize thumbnail over rendered_image
  const imageSrc = avatar.thumbnail || avatar.rendered_image;
  const placeholderColor = React.useMemo(() => getPlaceholderColor(avatar.avatar_id), [avatar.avatar_id]);

  return (
    <div
      className={`relative ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Circular Avatar */}
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden border-4 ${
          avatar.is_primary ? 'border-primary' : 'border-base-200'
        } ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
        style={!imageSrc ? { backgroundColor: placeholderColor } : {}}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={avatar.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-white/80">
            <div className="text-center">
              <div className="text-2xl">👤</div>
            </div>
          </div>
        )}
      </div>

      {/* Primary Badge */}
      {avatar.is_primary && showPrimaryBadge && (
        <div className="absolute -top-1 -right-1 bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center shadow-lg">
          <FontAwesomeIcon icon={faStar} className="text-xs" />
        </div>
      )}

      {/* Avatar Name (optional, shown below) */}
      {size !== 'sm' && (
        <div className="text-center mt-2 max-w-full">
          <p className="text-xs sm:text-sm font-semibold truncate px-1">{avatar.name}</p>
          {avatar.status && (
            <span className={`badge badge-xs ${
              avatar.status === 'active' ? 'badge-success' :
              avatar.status === 'draft' ? 'badge-warning' :
              'badge-ghost'
            }`}>
              {avatar.status}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default AvatarPreview;

