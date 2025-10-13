import CommentsRenderer from "@components/common/posts-feature/comments-renderer.component";
import { usePostContext } from "@context/post-context";
import PostHeader from "../post-header";
import HeartButton from "@components/common/posts-feature/heart-button";
import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faComment, faShare, faXmark } from "@fortawesome/free-solid-svg-icons";

const PostViewModal = () => {
  const {
    activePost,
    setActivePost,
    commentPagination,
    loadingComments,
    loadMoreComments,
    heartPost,
    unheartPost,
    loadingHearts,
  } = usePostContext();

  // Novel-specific state
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  // Mobile comments state
  const [showComments, setShowComments] = useState(false);
  // Screen size state
  const [isMobile, setIsMobile] = useState(false);

  if (!activePost) return null;

  const isLoading = loadingComments[activePost.post_id];
  const pagination = commentPagination[activePost.post_id];
  const hasMoreComments = pagination?.hasNext;

  const pageSize = 10; // TEMPORARY FIX!

  // Novel post data
  const novelChapters = activePost.novel_post || [];
  const currentChapter = novelChapters[currentChapterIndex];
  const hasPreviousChapter = currentChapterIndex > 0;
  const hasNextChapter = currentChapterIndex < novelChapters.length - 1;

  // Check screen size on mount and resize
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Reset comments state when post changes or on desktop
  useEffect(() => {
    if (!isMobile) {
      setShowComments(true);
    } else {
      setShowComments(false);
    }
  }, [isMobile, activePost]);

  const handleLoadMore = async () => {
    if (hasMoreComments && !isLoading) {
      await loadMoreComments(activePost.post_id);
    }
  };

  const handleNextChapter = () => {
    if (hasNextChapter) {
      setCurrentChapterIndex((prev) => prev + 1);
    }
  };

  const handlePreviousChapter = () => {
    if (hasPreviousChapter) {
      setCurrentChapterIndex((prev) => prev - 1);
    }
  };

  const toggleComments = () => {
    setShowComments(!showComments);
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
          <div className="w-full h-full bg-base-200 flex flex-col">
            {/* Novel Header */}
            <div className="bg-base-300 p-4 border-b border-base-400 flex-shrink-0">
              <div className="text-center">
                <h3 className="text-xl font-bold text-base-content">
                  {activePost.description || "Novel Post"}
                </h3>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-base-content/70">
                    Chapter {currentChapterIndex + 1} of {novelChapters.length}
                  </span>
                  <span className="text-sm text-base-content/70">
                    {currentChapter?.chapter ||
                      `Chapter ${currentChapterIndex + 1}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Chapter Navigation Bottom */}
            {novelChapters.length > 1 && (
              <div className="flex justify-between items-center p-4 bg-base-300 border-t border-base-400 flex-shrink-0">
                <button
                  onClick={handlePreviousChapter}
                  disabled={!hasPreviousChapter}
                  className={`btn btn-sm ${
                    !hasPreviousChapter ? "btn-disabled" : "btn-primary"
                  }`}
                >
                  ← Previous
                </button>

                <span className="text-sm text-base-content/70">
                  Chapter {currentChapterIndex + 1} of {novelChapters.length}
                </span>

                <button
                  onClick={handleNextChapter}
                  disabled={!hasNextChapter}
                  className={`btn btn-sm ${
                    !hasNextChapter ? "btn-disabled" : "btn-primary"
                  }`}
                >
                  Next →
                </button>
              </div>
            )}

            {/* Chapter Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <div className="h-full overflow-y-auto p-6">
                {currentChapter ? (
                  <div className="max-w-none w-full">
                    <h2 className="text-2xl font-bold text-center mb-6 text-base-content break-words">
                      {currentChapter.chapter ||
                        `Chapter ${currentChapterIndex + 1}`}
                    </h2>
                    <div className="whitespace-pre-wrap text-base-content leading-relaxed break-words overflow-wrap-break-word">
                      {currentChapter.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📖</div>
                      <p className="text-base-content/70">
                        No chapter content available
                      </p>
                    </div>
                  </div>
                )}
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
        className="fixed inset-0 bg-black/70 z-60 flex items-center justify-center"
        onClick={(e) => {
          if (e.target === e.currentTarget) setActivePost(null);
        }}
      >
        <div className="bg-base-100 w-[90%] h-[90%] rounded-lg overflow-hidden flex relative">
          {/* Left: Post Content */}
          <div
            className={`flex-1 bg-black flex items-center justify-center min-w-0 transition-all duration-300 ${
              isMobile && showComments ? "hidden" : "block"
            }`}
          >
            <div className="w-full h-full bg-base-100 flex items-center justify-center relative">
              {renderPostContent()}

              {/* Instagram-style Bottom Bar (Mobile Only) */}
              {isMobile && !showComments && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  {/* Poster Info */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="avatar">
                      <div className="w-8 h-8 rounded-full bg-base-300 flex items-center justify-center">
                        <img
                          src={activePost.author_picture}
                          alt={activePost.author_username}
                          className="rounded-full"
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">
                        {activePost.author_username || "Unknown User"}
                      </p>
                      {activePost.description && (
                        <p className="text-white/80 text-xs line-clamp-1">
                          {activePost.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Heart Button */}
                      <HeartButton
                        postId={activePost.post_id}
                        heartsCount={activePost.hearts_count || 0}
                        isHearted={activePost.is_hearted_by_user || false}
                        onHeart={heartPost}
                        onUnheart={unheartPost}
                        isLoading={loadingHearts[activePost.post_id]}
                        size="md"
                        className={"text-white"}
                      />

                      {/* Comment Button */}
                      <button
                        onClick={toggleComments}
                        className="flex items-center gap-2 text-white p-1 px-2 h-8 rounded-md hover:text-secondary hover:bg-secondary-content hover:cursor-pointer transition-transform"
                      >
                        <FontAwesomeIcon icon={faComment} className="text-lg " />
                      </button>
                    </div>

                    {/* Share Button */}
                    <button className="text-white hover:scale-110 transition-transform">
                      <FontAwesomeIcon icon={faShare} className="text-lg" />
                    </button>
                  </div>
                </div>
              )}

              {/* Close Button (Mobile Only) */}
              {isMobile && !showComments && (
                <button
                  onClick={() => setActivePost(null)}
                  className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer p-2 hover:bg-black/70 transition-colors"
                >
                  <FontAwesomeIcon icon={faXmark} className="text-lg" />
                </button>
              )}
            </div>
          </div>

          {/* Right: Comments */}
          <div
            className={`flex flex-col border-l border-base-300 flex-shrink-0 transition-all duration-300 ${
              isMobile
                ? `absolute inset-0 bg-base-100 transform ${
                    showComments ? "translate-x-0" : "translate-x-full"
                  }`
                : "w-[400px]"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pt-4 pr-4">
              <PostHeader postItem={activePost} IsCommentViewModal={true} />
              <div className="flex items-center gap-2">
                {isMobile && (
                  <button
                    onClick={toggleComments}
                    className="btn btn-ghost btn-sm"
                  >
                    <FontAwesomeIcon icon={faXmark} className="text-lg" />
                  </button>
                )}
                {!isMobile && (
                  <button
                    onClick={() => setActivePost(null)}
                    className="btn btn-ghost btn-sm"
                  >
                    <FontAwesomeIcon icon={faXmark} className="text-lg" />
                  </button>
                )}
              </div>
            </div>

            {/* Caption - Only show for non-default posts */}
            {activePost.post_type && activePost.post_type !== "default" && (
              <div className="px-4 pb-4 border-b border-base-300">
                <p className="text-sm">{activePost.description}</p>
              </div>
            )}

            {/* Comments List with Scroll */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <CommentsRenderer
                  postItem={activePost}
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

export default PostViewModal;
