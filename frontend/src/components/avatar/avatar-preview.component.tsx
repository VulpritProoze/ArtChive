import React from 'react';
import type { Avatar } from '@services/avatar.service';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar } from '@fortawesome/free-solid-svg-icons';
import AvatarRenderer from './avatar-renderer.component';
import type { AvatarOptions } from './avatar-options';
import { defaultAvatarOptions } from './avatar-options';

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

const sizePixels = {
  sm: 64,
  md: 96,
  lg: 128,
  xl: 192,
};

/**
 * AvatarPreview Component
 * Shows a circular preview of an avatar with optional primary badge
 * Falls back to SVG rendering from options when rendered_image is not available
 */
const AvatarPreview: React.FC<AvatarPreviewProps> = ({
  avatar,
  size = 'md',
  onClick,
  showPrimaryBadge = true,
  className = '',
}) => {
  const imageSrc = avatar.rendered_image || avatar.thumbnail;
  
  // Extract avatar options from canvas_json if available
  const avatarOptions: AvatarOptions = React.useMemo(() => {
    if (avatar.canvas_json && (avatar.canvas_json as any).avatarOptions) {
      return (avatar.canvas_json as any).avatarOptions as AvatarOptions;
    }
    return defaultAvatarOptions;
  }, [avatar.canvas_json]);

  const shouldRenderSVG = !imageSrc && avatar.canvas_json && (avatar.canvas_json as any).avatarOptions;

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
        ) : shouldRenderSVG ? (
          <div className="w-full h-full flex items-center justify-center">
            <AvatarRenderer
              options={avatarOptions}
              size={sizePixels[size]}
              className="w-full h-full"
            />
          </div>
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

