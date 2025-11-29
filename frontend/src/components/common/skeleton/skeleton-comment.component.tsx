interface SkeletonCommentProps {
    /** Number of skeleton comments to render */
    count?: number;
    /** Whether this is a reply (adds indentation) */
    isReply?: boolean;
}

export function SkeletonComment({ count = 1, isReply = false }: SkeletonCommentProps) {
    const skeletons = Array.from({ length: count }, (_, index) => (
        <div
            key={index}
            className={`flex gap-3 ${isReply ? "ml-12 mt-3" : "py-3 border-b border-base-300"}`}
        >
            {/* Avatar Skeleton */}
            <div className="flex-shrink-0">
                <div className="skeleton w-8 h-8 rounded-full"></div>
            </div>

            {/* Content Skeleton */}
            <div className="flex-1 space-y-2">
                {/* Header (Name + Artist Type) */}
                <div className="flex items-center gap-2">
                    <div className="skeleton h-4 w-24"></div>
                    <div className="skeleton h-3 w-20"></div>
                </div>

                {/* Text Body */}
                <div className="space-y-1">
                    <div className="skeleton h-4 w-full"></div>
                    <div className="skeleton h-4 w-3/4"></div>
                </div>

                {/* Footer (Date + Actions) */}
                <div className="flex items-center gap-4 mt-1">
                    <div className="skeleton h-3 w-16"></div>
                    <div className="skeleton h-3 w-12"></div>
                </div>
            </div>
        </div>
    ));

    return <>{skeletons}</>;
}
