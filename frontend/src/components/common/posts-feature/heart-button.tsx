// components/common/posts-feature/HeartButton.tsx
import React from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart as solidHeart } from "@fortawesome/free-solid-svg-icons";
import { faHeart as regularHeart } from "@fortawesome/free-regular-svg-icons";

interface HeartButtonProps {
  postId: string;
  heartsCount: number;
  isHearted: boolean;
  onHeart: (postId: string) => void;
  onUnheart: (postId: string) => void;
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string
}

const HeartButton: React.FC<HeartButtonProps> = ({
  postId,
  heartsCount,
  isHearted,
  onHeart,
  onUnheart,
  isLoading = false,
  size = 'md',
  className = ''
}) => {
  const handleClick = () => {
    if (isLoading) return;
    
    if (isHearted) {
      onUnheart(postId);
    } else {
      onHeart(postId);
    }
  };

  const sizeClasses = {
    sm: 'btn-sm text-sm',
    md: 'btn-md text-base',
    lg: 'btn-lg text-lg'
  };

  return (
    <button
      className={`btn btn-ghost gap-2 p-1 h-8 ${className} ${sizeClasses[size]} ${
        isHearted ? 'text-red-500 hover:text-red-600' : 'text-base-content hover:text-red-500'
      } transition-colors`}
      onClick={handleClick}
      disabled={isLoading}
      aria-label={isHearted ? 'Unheart post' : 'Heart post'}
    >
      {isLoading ? (
        <div className="loading loading-spinner loading-xs"></div>
      ) : (
        <FontAwesomeIcon 
          icon={isHearted ? solidHeart : regularHeart} 
          className={isHearted ? 'text-red-500' : ''}
        />
      )}
      <span className={isHearted ? 'text-red-500 font-semibold' : ''}>
        {heartsCount}
      </span>
    </button>
  );
};

export default HeartButton;