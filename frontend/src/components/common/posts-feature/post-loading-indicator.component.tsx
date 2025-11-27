import React from "react";
import { usePostContext } from "@context/post-context";
import { SkeletonPostCard } from "@components/common/skeleton";

const PostLoadingIndicator = ({ observerTarget }: { observerTarget: React.Ref<HTMLDivElement> }) => {
  const { loadingMore, pagination, posts} = usePostContext()

  const postsLength = posts.length

  return (
    <>
      {loadingMore && (
        <div className="py-4">
          <SkeletonPostCard count={3} containerClassName="space-y-4" />
        </div>
      )}

      {pagination.hasNext && !loadingMore && (
        <div
          ref={observerTarget}
          className="h-10"
          aria-label="Load more posts"
        />
      )}

      {!pagination.hasNext && postsLength > 0 && (
        <div className="text-center py-8 text-gray-500">
          You've reached the end! {pagination.totalCount} posts total.
        </div>
      )}
    </>
  );
}

export default PostLoadingIndicator;