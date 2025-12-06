import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { avatarService } from '@services/avatar.service';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import AvatarRenderer from './avatar-renderer.component';
import type { AvatarOptions } from './avatar-options';
import { defaultAvatarOptions } from './avatar-options';

interface AvatarDisplayProps {
  userId?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  fallbackSrc?: string;
  showRing?: boolean;
}

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
  '2xl': 'w-32 h-32',
};

const iconSizes = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-3xl',
  '2xl': 'text-4xl',
};

const sizePixels = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
  '2xl': 128,
};

/**
 * AvatarDisplay Component
 * Displays user's primary avatar or fallback profile picture
 * Automatically fetches and displays the rendered avatar image
 */
const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  userId,
  size = 'md',
  className = '',
  fallbackSrc,
  showRing = false,
}) => {
  // Fetch user's avatars
  const { data: avatars } = useQuery({
    queryKey: ['user-avatars', userId],
    queryFn: () => avatarService.list(),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get primary avatar
  const primaryAvatar = avatars?.find(avatar => avatar.is_primary);
  const avatarSrc = primaryAvatar?.rendered_image || primaryAvatar?.thumbnail;

  // Extract avatar options from canvas_json if available
  const avatarOptions: AvatarOptions | null = React.useMemo(() => {
    if (primaryAvatar?.canvas_json && (primaryAvatar.canvas_json as any).avatarOptions) {
      return (primaryAvatar.canvas_json as any).avatarOptions as AvatarOptions;
    }
    return null;
  }, [primaryAvatar?.canvas_json]);

  const shouldRenderSVG = !avatarSrc && !fallbackSrc && avatarOptions;

  // Determine what to display
  const displaySrc = avatarSrc || fallbackSrc;

  return (
    <div className={`avatar ${showRing ? 'avatar-ring' : ''} ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full bg-base-300 overflow-hidden ${
          showRing ? 'ring ring-primary ring-offset-base-100 ring-offset-2' : ''
        }`}
      >
        {displaySrc ? (
          <img
            src={displaySrc}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : shouldRenderSVG && avatarOptions ? (
          <div className="w-full h-full flex items-center justify-center">
            <AvatarRenderer
              options={avatarOptions}
              size={sizePixels[size]}
              className="w-full h-full"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center w-full h-full text-base-content/50">
            <FontAwesomeIcon icon={faUser} className={iconSizes[size]} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AvatarDisplay;

