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
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
  xl: 'w-48 h-48',
};

/**
 * AvatarPreview Component
 * Shows a circular preview of an avatar with optional primary badge
 */
const AvatarPreview: React.FC<AvatarPreviewProps> = ({
  avatar,
  size = 'md',
  onClick,
  showPrimaryBadge = true,
  className = '',
}) => {
  const imageSrc = avatar.rendered_image || avatar.thumbnail;

  return (
    <div
      className={`relative ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Circular Avatar */}
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden bg-base-300 border-4 ${
          avatar.is_primary ? 'border-primary' : 'border-base-200'
        } ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={avatar.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-base-content/30">
            <div className="text-center">
              <div className="text-4xl mb-1">🎭</div>
              <p className="text-xs">No Preview</p>
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
        <div className="text-center mt-2">
          <p className="text-sm font-semibold truncate">{avatar.name}</p>
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

