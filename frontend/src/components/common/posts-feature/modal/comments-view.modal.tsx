// comments-view-modal.tsx
import CommentsRenderer from "@components/common/posts-feature/comments-renderer.component";
import { usePostContext } from "@context/post-context";
import PostHeader from "../post-header";

const CommentsViewModal = () => {
  const {
    activePost,
    setActivePost,
    commentPagination,
    loadingComments,
    loadMoreComments,
  } = usePostContext();

  if (!activePost) return null;

  const isLoading = loadingComments[activePost.post_id];
  const pagination = commentPagination[activePost.post_id];
  const hasMoreComments = pagination?.hasNext;

  const pageSize = 10; // TEMPORARY FIX!

  const handleLoadMore = async () => {
    if (hasMoreComments && !isLoading) {
      await loadMoreComments(activePost.post_id);
    }
  };

  const renderPostContent = () => {
    switch (activePost.post_type) {
      case "image":
        return (
          <img
            src={activePost.image_url}
            alt={activePost.description}
            className="max-h-full max-w-full object-contain"
          />
        );
      
      case "video":
        return (
          <video controls className="max-h-full max-w-full object-contain">
            <source src={activePost.video_url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        );
      
      case "novel":
        return (
          <div className="w-full h-full bg-base-200 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-6">📖</div>
              <h3 className="text-2xl font-bold text-base-content mb-4">
                {activePost.description || "Novel Post"}
              </h3>
              <p className="text-base-content/70 mb-4">
                {activePost.novel_post?.length || 0} chapters
              </p>
              <div className="bg-base-100 p-4 rounded-lg">
                <p className="text-sm text-base-content/80">
                  Read the full novel in the app
                </p>
              </div>
            </div>
          </div>
        );
      
      case "default":
      default:
        return (
          <div className="w-full h-full bg-base-200 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="text-4xl mb-6">💬</div>
              <h3 className="text-xl font-bold text-base-content mb-4">
                Text Post
              </h3>
              <div className="bg-base-100 p-6 rounded-lg max-h-60 overflow-y-auto">
                <p className="text-base-content whitespace-pre-wrap text-left">
                  {activePost.description}
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
        onClick={(e) => {
          if (e.target === e.currentTarget) setActivePost(null);
        }}
      >
        <div className="bg-base-100 w-[90%] h-[90%] rounded-lg overflow-hidden flex">
          {/* Left: Post Content */}
          <div className="flex-1 bg-black flex items-center justify-center">
            {renderPostContent()}
          </div>

          {/* Right: Comments */}
          <div className="w-[400px] flex flex-col border-l border-base-300">
            {/* Header */}
            <div className="flex items-center justify-between pt-4 pr-4">
              <PostHeader postItem={activePost} IsCommentViewModal={true} />
              <button
                onClick={() => setActivePost(null)}
                className="btn btn-ghost btn-sm"
              >
                ✕
              </button>
            </div>

            {/* Caption - Only show for non-default posts */}
            {(activePost.post_type && activePost.post_type !== "default") && (
              <div className="px-4 pb-4 border-b border-base-300">
                <p className="text-sm">
                  {activePost.description}
                </p>
              </div>
            )}

            {/* Comments List with Scroll */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <CommentsRenderer
                  postId={activePost.post_id}
                  isFirstComments={false}
                />
              </div>

              {/* Load More Button */}
              {hasMoreComments && (
                <div className="px-4 pb-4 border-t border-base-300 pt-4">
                  <button
                    className="btn btn-sm w-full"
                    onClick={handleLoadMore}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="loading loading-spinner loading-xs"></div>
                        Loading more comments...
                      </>
                    ) : (
                      "See More Comments"
                    )}
                  </button>

                  {/* Pagination Info */}
                  {pagination && (
                    <div className="text-center text-xs text-gray-500 mt-2">
                      Showing {pagination.currentPage * pageSize} of{" "}
                      {pagination.totalCount} comments
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CommentsViewModal;