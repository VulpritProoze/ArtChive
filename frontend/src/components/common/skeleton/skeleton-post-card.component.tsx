interface SkeletonPostCardProps {
  /** Number of skeleton post cards to render */
  count?: number;
  /** Custom className for the container */
  containerClassName?: string;
  /** Custom className for individual skeleton cards */
  cardClassName?: string;
  /** Show skeleton for media content */
  showMedia?: boolean;
  /** Show skeleton for text content (for text-only posts) */
  showTextContent?: boolean;
  /** Show skeleton for caption */
  showCaption?: boolean;
  /** Show skeleton for comments section */
  showComments?: boolean;
}

export function SkeletonPostCard({
  count = 1,
  containerClassName = '',
  cardClassName = '',
  showMedia = true,
  showTextContent = false,
  showCaption = true,
  showComments = true,
}: SkeletonPostCardProps) {
  const cards = Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      className={`card bg-base-200 border border-base-300 rounded-xl shadow-sm ${cardClassName}`}
    >
      {/* Skeleton Post Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="skeleton w-8 h-8 rounded-full"></div>
          <div className="flex flex-col gap-1">
            {/* Author name */}
            <div className="skeleton h-4 w-24"></div>
            {/* Artist types */}
            <div className="skeleton h-3 w-32"></div>
          </div>
        </div>
        {/* Dropdown button */}
        <div className="skeleton w-6 h-6 rounded"></div>
      </div>

      {/* Skeleton Media Content */}
      {showMedia && (
        <div className="w-full h-96 bg-base-300">
          <div className="w-full h-full skeleton"></div>
        </div>
      )}

      {/* Skeleton Text Content (for text-only posts) */}
      {showTextContent && (
        <div className="p-6">
          <div className="space-y-2">
            <div className="skeleton h-4 w-full"></div>
            <div className="skeleton h-4 w-full"></div>
            <div className="skeleton h-4 w-3/4"></div>
          </div>
        </div>
      )}

      {/* Skeleton Action Buttons */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            {/* Action buttons */}
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton w-8 h-8 rounded-full"></div>
            ))}
          </div>
          {/* Bookmark button */}
          <div className="skeleton w-8 h-8 rounded-full"></div>
        </div>

        {/* Skeleton Likes/Engagement Counts */}
        <div className="mb-2 flex flex-row gap-3 items-center flex-wrap">
          <div className="skeleton h-4 w-16"></div>
          <div className="skeleton h-4 w-20"></div>
          <div className="skeleton h-3 w-24"></div>
        </div>

        {/* Skeleton Caption */}
        {showCaption && (
          <div className="mb-2">
            <div className="space-y-1">
              <div className="skeleton h-4 w-20"></div>
              <div className="skeleton h-4 w-full"></div>
              <div className="skeleton h-4 w-2/3"></div>
            </div>
          </div>
        )}

        {/* Skeleton Comments Section */}
        {showComments && (
          <div className="mt-2 pt-2 border-t border-base-300">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="skeleton w-6 h-6 rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <div className="skeleton h-3 w-24"></div>
                  <div className="skeleton h-3 w-full"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  ));

  if (count === 1) {
    return cards[0];
  }

  return <div className={containerClassName}>{cards}</div>;
}

