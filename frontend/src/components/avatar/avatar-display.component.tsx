import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { avatarService } from '@services/avatar.service';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';

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

  // Determine what to display
  const displaySrc = avatarSrc || fallbackSrc;

  return (
    <div className={`avatar ${showRing ? 'avatar-ring' : ''} ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full bg-base-300 ${
          showRing ? 'ring ring-primary ring-offset-base-100 ring-offset-2' : ''
        }`}
      >
        {displaySrc ? (
          <img
            src={displaySrc}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
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

