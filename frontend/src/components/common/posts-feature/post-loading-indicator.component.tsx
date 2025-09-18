import React from "react";
import { usePostContext } from "@context/post-context";

const PostLoadingIndicator = ({ observerTarget }: { observerTarget: React.Ref<HTMLDivElement> }) => {
  const { loadingMore, pagination, posts} = usePostContext()

  const postsLength = posts.length

  return (
    <>
      {loadingMore && (
        <div className="flex justify-center py-4">
          <div className="loading loading-spinner loading-lg"></div>
          <span className="ml-2">Loading more posts...</span>
        </div>
      )}

      {pagination.hasNext && !loadingMore && (
        <div
          ref={observerTarget}
          className="h-10 flex justify-center items-center"
        >
          <div className="loading loading-spinner"></div>
        </div>
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