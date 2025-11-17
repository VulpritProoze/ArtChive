interface SkeletonCardProps {
  /** Number of skeleton cards to render */
  count?: number;
  /** Custom className for the container grid */
  containerClassName?: string;
  /** Custom className for individual skeleton cards */
  cardClassName?: string;
  /** Height of the thumbnail skeleton */
  thumbnailHeight?: string;
  /** Show skeleton for title */
  showTitle?: boolean;
  /** Show skeleton for description */
  showDescription?: boolean;
  /** Show skeleton for meta info */
  showMetaInfo?: boolean;
  /** Number of description lines */
  descriptionLines?: number;
}

export function SkeletonCard({
  count = 1,
  containerClassName = '',
  cardClassName = '',
  thumbnailHeight = 'h-56',
  showTitle = true,
  showDescription = true,
  showMetaInfo = true,
  descriptionLines = 2,
}: SkeletonCardProps) {
  const cards = Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      className={`card bg-base-200 shadow-xl overflow-hidden ${cardClassName}`}
    >
      {/* Skeleton Thumbnail */}
      <figure className={`relative ${thumbnailHeight} bg-base-300`}>
        <div className="w-full h-full skeleton"></div>
      </figure>

      {/* Skeleton Card Body */}
      <div className="card-body p-5">
        {/* Skeleton Title and Badge */}
        {showTitle && (
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="skeleton h-6 w-32 flex-1"></div>
            <div className="skeleton h-5 w-16"></div>
          </div>
        )}

        {/* Skeleton Description */}
        {showDescription && (
          <div className="space-y-2 mb-2">
            {Array.from({ length: descriptionLines }, (_, i) => (
              <div
                key={i}
                className={`skeleton h-4 ${i === descriptionLines - 1 ? 'w-3/4' : 'w-full'}`}
              ></div>
            ))}
          </div>
        )}

        {/* Skeleton Meta Info */}
        {showMetaInfo && (
          <div className="flex items-center gap-4 text-xs mt-2 border-t border-base-300 pt-3">
            <div className="skeleton h-3 w-20"></div>
            <div className="skeleton h-3 w-16"></div>
            <div className="ml-auto skeleton h-3 w-12"></div>
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

