interface SkeletonCollectiveCardProps {
  /** Number of skeleton cards to render */
  count?: number;
  /** Custom className for the container */
  containerClassName?: string;
  /** Custom className for individual skeleton cards */
  cardClassName?: string;
}

export function SkeletonCollectiveCard({
  count = 1,
  containerClassName = '',
  cardClassName = '',
}: SkeletonCollectiveCardProps) {
  const cards = Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      className={`card bg-base-100 shadow-md border border-base-300 ${cardClassName}`}
    >
      <div className="card-body p-4">
        <div className="flex gap-4">
          {/* Skeleton Thumbnail */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 bg-base-300 rounded-lg skeleton"></div>
          </div>

          {/* Skeleton Info Section */}
          <div className="flex-1 min-w-0">
            {/* Title and Meta Info */}
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                {/* Title */}
                <div className="skeleton h-6 w-48 mb-2"></div>
                {/* Meta Info */}
                <div className="flex items-center gap-3">
                  <div className="skeleton h-4 w-20"></div>
                  <div className="skeleton h-4 w-16"></div>
                  <div className="skeleton h-4 w-16"></div>
                </div>
              </div>
              <div className="text-right">
                <div className="skeleton h-4 w-20 mb-1"></div>
                <div className="skeleton h-3 w-24"></div>
              </div>
            </div>

            {/* Artist Types */}
            <div className="flex flex-wrap gap-2 mb-3">
              <div className="skeleton h-6 w-16 rounded-full"></div>
              <div className="skeleton h-6 w-20 rounded-full"></div>
              <div className="skeleton h-6 w-18 rounded-full"></div>
            </div>

            {/* Channels */}
            <div className="flex flex-wrap gap-2 mb-3">
              <div className="skeleton h-5 w-24"></div>
              <div className="skeleton h-5 w-28"></div>
              <div className="skeleton h-5 w-20"></div>
            </div>

            {/* Action Button */}
            <div className="skeleton h-8 w-20 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  ));

  if (count === 1) {
    return cards[0];
  }

  return <div className={containerClassName}>{cards}</div>;
}

