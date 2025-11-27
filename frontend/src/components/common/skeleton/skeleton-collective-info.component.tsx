interface SkeletonCollectiveInfoProps {
  /** Custom className */
  className?: string;
}

export function SkeletonCollectiveInfo({ className = '' }: SkeletonCollectiveInfoProps) {
  return (
    <div className={`bg-base-100 rounded-xl p-6 shadow-md ${className}`}>
      {/* Title */}
      <div className="mb-3">
        <div className="skeleton h-9 w-64"></div>
      </div>

      {/* Meta Info */}
      <div className="flex items-center gap-4 mb-4">
        <div className="skeleton h-5 w-32"></div>
        <div className="skeleton h-5 w-28"></div>
      </div>

      {/* Artist Types */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="skeleton h-7 w-20 rounded-full"></div>
        <div className="skeleton h-7 w-24 rounded-full"></div>
        <div className="skeleton h-7 w-16 rounded-full"></div>
      </div>

      {/* Member Avatars */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex -space-x-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="skeleton w-10 h-10 rounded-full border-2 border-base-100"></div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <div className="skeleton h-10 w-24 rounded-lg"></div>
        <div className="skeleton h-10 w-24 rounded-lg"></div>
        <div className="skeleton h-10 w-24 rounded-lg"></div>
      </div>

      {/* Post Input */}
      <div className="flex items-center gap-3 p-4 bg-base-200 rounded-lg">
        <div className="skeleton w-10 h-10 rounded-full"></div>
        <div className="skeleton h-10 flex-1 rounded"></div>
        <div className="flex gap-2">
          <div className="skeleton w-8 h-8 rounded"></div>
          <div className="skeleton w-8 h-8 rounded"></div>
          <div className="skeleton w-8 h-8 rounded"></div>
        </div>
      </div>
    </div>
  );
}

