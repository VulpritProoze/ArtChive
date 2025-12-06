interface SkeletonMemberCardProps {
  /** Number of skeleton cards to render */
  count?: number;
  /** Custom className for the container grid */
  containerClassName?: string;
}

export function SkeletonMemberCard({
  count = 1,
  containerClassName = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
}: SkeletonMemberCardProps) {
  const cards = Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      className="card bg-base-200 shadow-md"
    >
      <div className="card-body p-4">
        <div className="flex items-center gap-3">
          {/* Skeleton Avatar */}
          <div className="avatar">
            <div className="w-12 h-12 rounded-full skeleton"></div>
          </div>

          {/* Skeleton Info */}
          <div className="flex-1 min-w-0">
            <div className="skeleton h-5 w-32 mb-2"></div>
            <div className="skeleton h-4 w-24 mb-2"></div>
            <div className="skeleton h-4 w-16"></div>
          </div>
        </div>

        {/* Skeleton Artist Types */}
        <div className="flex flex-wrap gap-1 mt-2">
          <div className="skeleton h-5 w-16"></div>
          <div className="skeleton h-5 w-20"></div>
        </div>
      </div>
    </div>
  ));

  if (count === 1) {
    return cards[0];
  }

  return <div className={containerClassName}>{cards}</div>;
}

