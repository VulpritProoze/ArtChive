import type { RefObject } from "react";
import { SkeletonPostCard } from "@components/common/skeleton";

interface InfiniteScrollingProps {
  observerTarget: RefObject<HTMLDivElement | null>;
  isFetchingMore?: boolean;
  hasNextPage?: boolean;
  totalCount?: number;
  itemCount?: number;
}

const InfiniteScrolling = ({
  observerTarget,
  isFetchingMore = false,
  hasNextPage = false,
  totalCount = 0,
  itemCount = 0,
}: InfiniteScrollingProps) => {
  return (
    <>
      {isFetchingMore && (
        <div className="py-4">
          <SkeletonPostCard count={3} containerClassName="space-y-4" />
        </div>
      )}

      {hasNextPage && !isFetchingMore && (
        <div
          ref={observerTarget}
          className="h-10"
          aria-label="Load more posts"
        />
      )}

      {!hasNextPage && itemCount > 0 && (
        <div className="text-center py-8 text-gray-500">
          You've reached the end! {totalCount || itemCount} posts total.
        </div>
      )}
    </>
  );
};

export default InfiniteScrolling;