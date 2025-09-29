import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@context/auth-context";
import { usePostContext } from "@context/post-context";
import usePost from "@hooks/use-post";
import {
  PostFormModal,
  CommentFormModal,
} from "@components/common/posts-feature/modal";
import { PostLoadingIndicator, CommentsRenderer } from "@components/common";
import { getCommentsForPost, formatArtistTypesToString } from "@utils";
import HeartButton from "@components/common/posts-feature/heart-button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCommentDots,
  faEllipsisH,
  faBookmark,
  faPaperPlane,
  faEdit,
  faTrash,
  faHeart as faHeartSolid,
  faPaperPlane as faPaperPlaneSolid,
} from "@fortawesome/free-solid-svg-icons";
import { faHeart, faPaperPlane as faPaperPlaneRegular } from "@fortawesome/free-regular-svg-icons";

const Timeline: React.FC = () => {
  const { user } = useAuth();
  const {
    comments,
    loadingComments,
    commentPagination,
    showCommentForm,

    // Posts
    posts,
    pagination,
    expandedPost,
    showPostForm,
    setShowPostForm,
    loading,
    loadingMore,
    fetchPosts,
    deletePost,

    // Hearting
    heartPost,
    unheartPost,
    loadingHearts,

    // Comments
    addComment,
    heartComment,
    unheartComment,
    loadingAddComment,
  } = usePostContext();

  const { setupEditPost, toggleComments } = usePost();

  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [expandedComments, setExpandedComments] = useState<{ [key: string]: boolean }>({});

  const observerTarget = useRef<HTMLDivElement>(null);
  const commentInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Infinite scrolling behavior
  useEffect(() => {
    let isFetching = false;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          pagination.hasNext &&
          !loadingMore &&
          !loading &&
          !isFetching
        ) {
          isFetching = true;
          fetchPosts(pagination.currentPage + 1, true, null, user?.id).finally(
            () => {
              isFetching = false; // Reset flag after fetch completes
            }
          );
        }
      },
      { threshold: 0.5 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
      observer.disconnect();
    };
  }, [
    pagination.hasNext,
    loadingMore,
    loading,
    fetchPosts,
    pagination.currentPage,
  ]);

  useEffect(() => {
    fetchPosts(1, false, null, user?.id);
  }, [fetchPosts]);

  const toggleDropdown = (postId: string) => {
    setDropdownOpen(dropdownOpen === postId ? null : postId);
  };

  const handleEdit = (postItem: any) => {
    setupEditPost(postItem);
    setDropdownOpen(null);
  };

  const handleDelete = (postId: string) => {
    deletePost(postId);
    setDropdownOpen(null);
  };

  const handleCommentChange = (postId: string, text: string) => {
    setCommentText(prev => ({
      ...prev,
      [postId]: text
    }));
  };

  const handleAddComment = async (postId: string) => {
    const text = commentText[postId]?.trim();
    if (text && addComment) {
      try {
        await addComment(postId, text);
        setCommentText(prev => ({
          ...prev,
          [postId]: ''
        }));
        // Refresh comments for this post
        toggleComments(postId);
      } catch (error) {
        console.error('Failed to add comment:', error);
      }
    }
  };

  const handleKeyPress = (postId: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment(postId);
    }
  };

  const toggleCommentExpansion = (postId: string) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const focusCommentInput = (postId: string) => {
    if (commentInputRefs.current[postId]) {
      commentInputRefs.current[postId]?.focus();
    }
  };

  const postComments = (postId: string) => {
    return getCommentsForPost(postId, comments);
  };

  const displayComments = (postId: string) => {
    const allComments = postComments(postId);
    if (allComments.length <= 2) {
      return allComments;
    }
    return expandedComments[postId] ? allComments : allComments.slice(-2);
  };

  // Check if comment functionality is available
  const canAddComment = !!addComment;
  const canHeartComment = !!heartComment && !!unheartComment;

  return (
    <div className="container mx-auto p-4">
      <Link to="/home">
        <p className="text-base-content hover:text-primary font-medium cursor-pointer">
          Back to Home
        </p>
      </Link>
      
      {/* profile top */}
      <div className="flex justify-center mt-6">
        <div className="bg-base-100 shadow rounded-2xl p-6 w-full max-w-2xl">
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            {/* Avatar */}
            <img
              src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/448.png"
              alt="profile avatar"
              className="w-24 h-24 rounded-full object-cover"
            />

            {/* Info */}
            <div className="flex-1">
              <h3 className="text-xl font-bold text-base-content">Chernobog</h3>
              <p className="text-base-content/70">@chernobog_art</p>
              <p className="text-sm mt-2 text-base-content/80">
                Digital artist specializing in character design and concept art.
                Currently working on a fantasy novel illustration series. Open
                for commissions!
              </p>

              {/* Stats */}
              <div className="flex justify-center sm:justify-start gap-8 mt-4">
                <div>
                  <h4 className="text-lg font-semibold text-base-content">248</h4>
                  <p className="text-base-content/70 text-sm">Posts</p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-base-content">12.5k</h4>
                  <p className="text-base-content/70 text-sm">Followers</p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-base-content">892</h4>
                  <p className="text-base-content/70 text-sm">Following</p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-5">
                <Link
                  to="/profile/me"
                  className="px-4 py-2 bg-base-200 rounded-lg hover:bg-base-300 text-sm font-medium text-base-content"
                >
                  Edit Profile
                </Link>
                <button className="px-4 py-2 bg-base-200 rounded-lg hover:bg-base-300 text-sm font-medium text-base-content">
                  Share Profile
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowPostForm(true)}
                >
                  Create Post
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Post Form Modal */}
      {showPostForm && <PostFormModal user_id={user?.id} />}

      {/* Comment Form Modal */}
      {showCommentForm && <CommentFormModal />}

      {/* Posts Section */}
      <div className="mb-12">
        {/* Tabs Section */}
        <div className="flex justify-center mt-6">
          <div className="rounded-2xl p-6 w-full max-w-2xl">
            <nav className="flex space-x-10">
              <button className="py-2 px-1 text-sm font-medium border-b-2 border-primary text-primary">
                Timeline
              </button>
              <button className="py-2 px-1 text-sm font-medium border-b-2 border-transparent text-base-content/70 hover:text-base-content hover:border-base-300">
                Works
              </button>
              <button className="py-2 px-1 text-sm font-medium border-b-2 border-transparent text-base-content/70 hover:text-base-content hover:border-base-300">
                Avatar
              </button>
              <button className="py-2 px-1 text-sm font-medium border-b-2 border-transparent text-base-content/70 hover:text-base-content hover:border-base-300">
                Collectives
              </button>
            </nav>
          </div>
        </div>

        {loading && posts.length === 0 && (
          <div className="text-center py-8">
            <div className="loading loading-spinner loading-lg"></div>
            <p className="mt-2 text-base-content">Loading posts...</p>
          </div>
        )}

        <div className="flex flex-col items-center gap-8">
          {posts.map((postItem) => {
            const commentsForPost = postComments(postItem.post_id);
            const displayedComments = displayComments(postItem.post_id);
            const isAddingComment = loadingAddComment?.[postItem.post_id];
            const hasCommentText = commentText[postItem.post_id]?.trim();

            return (
              <div
                key={postItem.post_id}
                className="card bg-base-100 border border-base-300 rounded-xl shadow-sm w-full max-w-2xl"
              >
                {/* Post Header - Instagram Style */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
                  <div className="flex items-center gap-3">
                    <img
                      src={postItem.author_picture}
                      alt="avatar"
                      className="w-8 h-8 rounded-full border border-base-300"
                    />
                    <div>
                      <p className="text-sm font-semibold text-base-content">
                        {postItem.author_username}
                      </p>
                      <p className="text-xs text-base-content/70">
                        {formatArtistTypesToString(postItem.author_artist_types)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Three-dots dropdown menu */}
                  <div className="dropdown dropdown-end">
                    <button 
                      className="btn btn-ghost btn-sm btn-circle"
                      onClick={() => toggleDropdown(postItem.post_id)}
                    >
                      <FontAwesomeIcon icon={faEllipsisH} />
                    </button>
                    
                    {dropdownOpen === postItem.post_id && (
                      <ul className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-32 border border-base-300">
                        <li>
                          <button 
                            className="text-sm flex items-center gap-2 text-base-content"
                            onClick={() => handleEdit(postItem)}
                          >
                            <FontAwesomeIcon icon={faEdit} />
                            Edit
                          </button>
                        </li>
                        <li>
                          <button 
                            className="text-sm text-error flex items-center gap-2"
                            onClick={() => handleDelete(postItem.post_id)}
                          >
                            <FontAwesomeIcon icon={faTrash} />
                            Delete
                          </button>
                        </li>
                      </ul>
                    )}
                  </div>
                </div>

                {/* Media Content */}
                {postItem.post_type === "image" && postItem.image_url && (
                  <div className="aspect-square bg-black flex items-center justify-center">
                    <img
                      src={postItem.image_url}
                      alt={postItem.description}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                {postItem.post_type === "video" && postItem.video_url && (
                  <div className="aspect-square bg-black flex items-center justify-center">
                    <video 
                      controls 
                      className="w-full h-full object-contain"
                    >
                      <source src={postItem.video_url} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}

                {postItem.post_type === "novel" && postItem.novel_post?.length > 0 && (
                  <div className="aspect-square bg-base-200 flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="text-4xl mb-4">📖</div>
                      <h3 className="text-xl font-bold text-base-content mb-2">
                        {postItem.description?.substring(0, 50)}...
                      </h3>
                      <p className="text-base-content/70">
                        {postItem.novel_post.length} chapters
                      </p>
                    </div>
                  </div>
                )}

                {/* Text-only post (default type) */}
                {(!postItem.post_type || postItem.post_type === 'default') && (
                  <div className="p-6 bg-base-100">
                    <div className="prose max-w-none">
                      <p className="text-base-content whitespace-pre-wrap">
                        {postItem.description}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <HeartButton
                        postId={postItem.post_id}
                        heartsCount={postItem.hearts_count || 0}
                        isHearted={postItem.is_hearted_by_user || false}
                        onHeart={heartPost}
                        onUnheart={unheartPost}
                        isLoading={loadingHearts[postItem.post_id]}
                        size="lg"
                      />

                      <button
                        className="btn btn-ghost btn-sm btn-circle"
                        onClick={() => {
                          toggleComments(postItem.post_id);
                          focusCommentInput(postItem.post_id);
                        }}
                        disabled={loadingComments[postItem.post_id]}
                      >
                        <FontAwesomeIcon 
                          icon={faCommentDots} 
                          className="text-xl hover:scale-110 transition-transform text-base-content" 
                        />
                      </button>

                      <button className="btn btn-ghost btn-sm btn-circle">
                        <FontAwesomeIcon 
                          icon={faPaperPlane} 
                          className="text-xl hover:scale-110 transition-transform text-base-content" 
                        />
                      </button>
                    </div>

                    <button className="btn btn-ghost btn-sm btn-circle">
                      <FontAwesomeIcon 
                        icon={faBookmark} 
                        className="text-xl hover:scale-110 transition-transform text-base-content" 
                      />
                    </button>
                  </div>

                  {/* Likes Count */}
                  <div className="mb-2">
                    <p className="text-sm font-semibold text-base-content">
                      {postItem.hearts_count || 0} likes
                    </p>
                  </div>

                  {/* Caption - Only show for non-text posts */}
                  {(postItem.post_type && postItem.post_type !== 'default') && (
                    <div className="mb-2">
                      <p className="text-sm text-base-content">
                        <span className="font-semibold">{postItem.author_username}</span>{" "}
                        {postItem.description}
                      </p>
                    </div>
                  )}

                  {/* Comments Section - Always Visible */}
                  <div className="space-y-3 mb-3">
                    {/* Show "View all comments" if there are more than 2 */}
                    {commentsForPost.length > 2 && !expandedComments[postItem.post_id] && (
                      <button
                        className="text-sm text-base-content/70 hover:text-base-content transition-colors -mb-2"
                        onClick={() => toggleCommentExpansion(postItem.post_id)}
                      >
                        View all {commentsForPost.length} comments
                      </button>
                    )}

                    {/* Display comments */}
                    {displayedComments.map((comment) => (
                      <div key={comment.comment_id} className="flex items-start gap-2 group">
                        <div className="flex-1">
                          <p className="text-sm text-base-content">
                            <span className="font-semibold">{comment.author}</span>{" "}
                            {comment.content}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-base-content/50">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                            <button className="text-xs text-base-content/50 hover:text-base-content">
                              Reply
                            </button>
                            {comment.hearts_count > 0 && (
                              <span className="text-xs text-base-content/50">
                                {comment.hearts_count} like{comment.hearts_count !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Comment heart button */}
                        {canHeartComment && (
                          <button
                            className="btn btn-ghost btn-xs btn-circle opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => 
                              comment.is_hearted_by_user 
                                ? unheartComment(comment.comment_id)
                                : heartComment(comment.comment_id)
                            }
                            disabled={loadingHearts[comment.comment_id]}
                          >
                            {loadingHearts[comment.comment_id] ? (
                              <div className="loading loading-spinner loading-xs"></div>
                            ) : (
                              <FontAwesomeIcon 
                                icon={comment.is_hearted_by_user ? faHeartSolid : faHeart} 
                                className={comment.is_hearted_by_user ? "text-red-500" : "text-base-content/70"}
                              />
                            )}
                          </button>
                        )}
                      </div>
                    ))}

                    {/* Show "View less" if expanded */}
                    {expandedComments[postItem.post_id] && commentsForPost.length > 2 && (
                      <button
                        className="text-sm text-base-content/70 hover:text-base-content transition-colors -mt-2"
                        onClick={() => toggleCommentExpansion(postItem.post_id)}
                      >
                        View less comments
                      </button>
                    )}
                  </div>

                  {/* Time Posted */}
                  <p className="text-xs text-base-content/50 uppercase mb-3">
                    {new Date(postItem.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>

                  {/* Add Comment Input - Instagram Style with Send Icon */}
                  <div className="flex items-center gap-2 border-t border-base-300 pt-3">
                    <input
                      ref={el => commentInputRefs.current[postItem.post_id] = el}
                      type="text"
                      placeholder="Add a comment..."
                      className="flex-1 border-none outline-none text-sm bg-transparent placeholder-base-content/50 text-base-content"
                      value={commentText[postItem.post_id] || ''}
                      onChange={(e) => handleCommentChange(postItem.post_id, e.target.value)}
                      onKeyPress={(e) => handleKeyPress(postItem.post_id, e)}
                      disabled={isAddingComment}
                    />
                    <button
                      className={`btn btn-ghost btn-sm btn-circle ${
                        hasCommentText && !isAddingComment
                          ? 'text-primary hover:text-primary-focus' 
                          : 'text-base-content/30'
                      }`}
                      onClick={() => handleAddComment(postItem.post_id)}
                      disabled={!hasCommentText || isAddingComment}
                    >
                      {isAddingComment ? (
                        <div className="loading loading-spinner loading-xs"></div>
                      ) : (
                        <FontAwesomeIcon 
                          icon={hasCommentText ? faPaperPlaneSolid : faPaperPlaneRegular}
                          className="text-lg"
                        />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Comments Section (if using the old CommentsRenderer) */}
                {expandedPost === postItem.post_id && (
                  <div className="border-t border-base-300">
                    <CommentsRenderer postId={postItem.post_id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {posts.length === 0 && !loading && (
          <div className="text-center py-8 text-base-content/70">
            No posts found. Create your first post!
          </div>
        )}

        <PostLoadingIndicator observerTarget={observerTarget} />
      </div>
    </div>
  );
};

export default Timeline;