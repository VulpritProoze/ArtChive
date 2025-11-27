import React, { useMemo } from 'react';
import { X, Heart } from 'lucide-react';
import { usePostHearts } from '@hooks/queries/use-post-lists';

interface HeartListModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

export const HeartListModal: React.FC<HeartListModalProps> = ({ isOpen, onClose, postId }) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = usePostHearts(postId, isOpen);

  const hearts = useMemo(
    () => data?.pages.flatMap((page) => page.results || []) ?? [],
    [data]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-base-100 rounded-2xl shadow-2xl w-full max-w-md max-h-[600px] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-error fill-error" />
            <h3 className="text-lg font-bold text-base-content">
              Likes
            </h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle hover:bg-base-200"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && hearts.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="loading loading-spinner loading-md text-primary"></div>
            </div>
          ) : hearts.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="w-12 h-12 mx-auto text-base-content/30 mb-3" />
              <p className="text-base-content/70">No likes yet</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {hearts.map((heart) => (
                  <div
                    key={heart.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-base-200 transition-colors"
                  >
                    {/* User Avatar */}
                    <img
                      src={heart.author_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(heart.author_username)}&background=random&size=40`}
                      alt={heart.author_username}
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(heart.author_username)}&background=random&size=40`;
                      }}
                    />
                    
                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-base-content truncate">
                        {heart.author_fullname}
                      </p>
                      <p className="text-xs text-base-content/60 truncate">
                        @{heart.author_username}
                      </p>
                    </div>

                    {/* Heart Icon */}
                    <Heart className="w-5 h-5 text-error fill-error flex-shrink-0" />
                  </div>
                ))}
              </div>
              {hasNextPage && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="btn btn-sm btn-outline"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <span className="loading loading-spinner loading-xs" />
                        Loading...
                      </>
                    ) : (
                      "Load More"
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

