interface SkeletonGalleryGridCardProps {
  /** Number of skeleton cards to render */
  count?: number;
}

export function SkeletonGalleryGridCard({ count = 1 }: SkeletonGalleryGridCardProps) {
  const cards = Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      className="card bg-base-100 rounded-xl overflow-hidden shadow-lg"
    >
      {/* Skeleton Image */}
      <div className="relative h-64 bg-base-300 overflow-hidden">
        <div className="w-full h-full skeleton"></div>
      </div>

      {/* Skeleton Card Footer */}
      <div className="bg-base-200 p-3">
        {/* Skeleton Title */}
        <div className="skeleton h-4 w-3/4 mb-3"></div>

        {/* Skeleton Artist Info */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-base-300 skeleton flex-shrink-0"></div>
          <div className="min-w-0 flex-1">
            <div className="skeleton h-3 w-20 mb-1"></div>
            <div className="skeleton h-2 w-32"></div>
          </div>
        </div>
      </div>
    </div>
  ));

  if (count === 1) {
    return cards[0];
  }

  return <>{cards}</>;
}

