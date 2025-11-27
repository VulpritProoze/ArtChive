interface SkeletonCollectiveSidebarProps {
  /** Custom className */
  className?: string;
}

export function SkeletonCollectiveSidebar({ className = '' }: SkeletonCollectiveSidebarProps) {
  return (
    <div className={`bg-base-200/50 rounded-xl p-3 ${className}`}>
      {/* Collective Name */}
      <div className="mb-2">
        <div className="skeleton h-8 w-3/4 rounded-lg"></div>
      </div>

      {/* Navigation Links */}
      <div className="mb-4 space-y-1">
        <div className="skeleton h-9 w-full rounded"></div>
        <div className="skeleton h-9 w-full rounded"></div>
      </div>

      {/* EVENTS Section */}
      <div className="mb-4">
        <div className="skeleton h-6 w-20 mb-1"></div>
        <div className="space-y-1">
          <div className="skeleton h-8 w-full rounded"></div>
          <div className="skeleton h-8 w-full rounded"></div>
        </div>
      </div>

      {/* POST CHANNELS Section */}
      <div className="mb-4">
        <div className="skeleton h-6 w-28 mb-1"></div>
        <div className="space-y-1">
          <div className="skeleton h-8 w-full rounded"></div>
          <div className="skeleton h-8 w-full rounded"></div>
          <div className="skeleton h-8 w-full rounded"></div>
        </div>
      </div>

      {/* MEDIA CHANNELS Section */}
      <div>
        <div className="skeleton h-6 w-32 mb-1"></div>
        <div className="space-y-1">
          <div className="skeleton h-8 w-full rounded"></div>
          <div className="skeleton h-8 w-full rounded"></div>
        </div>
      </div>
    </div>
  );
}

