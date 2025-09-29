import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { LogoutButton } from "@components/account/logout";
import {
  CommentFormModal,
  PostFormModal,
} from "@components/common/posts-feature/modal";
import usePost from "@hooks/use-post";
import { PostLoadingIndicator, CommentsRenderer } from "@components/common";
import { usePostContext } from "@context/post-context";
import { getCommentsForPost } from "@utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCommentDots,
  faBell,
  faTrophy,
  faQuestionCircle,
  faCog,
} from "@fortawesome/free-solid-svg-icons";
import HeartButton from "@components/common/posts-feature/heart-button";
import { formatArtistTypesToString } from "@utils";

const Index: React.FC = () => {
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
    setLoading,
    loadingMore,
    setLoadingMore,
    fetchPosts,
    deletePost,

    // Hearting
    heartPost,
    unheartPost,
    loadingHearts,
  } = usePostContext();
  const { setupEditPost, toggleComments } = usePost();

  const observerTarget = useRef<HTMLDivElement>(null);

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
          fetchPosts(pagination.currentPage + 1, true).finally(() => {
            isFetching = false; // Reset flag after fetch completes
          });
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
    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    fetchPosts(1);
  }, [fetchPosts]);

  return (
    /*container div */
    <div className="container max-w-full w-full">
      {/* Header/Navbar */}
      <div className="flex items-center justify-between bg-base-100 px-6 py-3 shadow w-full">
        {/* Logo */}
        <h2 className="text-xl font-bold text-primary">ArtChive</h2>

        {/* Search Bar */}
        <div className="flex-1 mx-6 hidden md:block">
          <input
            type="text"
            placeholder="Search artists, artworks, collectives..."
            className="w-full max-w-lg px-4 py-2 border border-base-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary bg-base-100 text-base-content placeholder-base-content/70"
          />
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-8">
          {/* User Profile */}
          <div className="flex items-center gap-3">
            <Link to="/profile">
              <img
                src="https://randomuser.me/api/portraits/men/75.jpg"
                alt="Chenoborg"
                className="w-10 h-10 rounded-full border border-base-300"
              />
            </Link>

            <div className="hidden md:block">
              <Link to="/profile">
                <h5 className="text-sm font-semibold text-base-content">
                  Chenoborg
                </h5>
              </Link>
              <p className="text-xs text-primary">@chenoborg_art</p>
              <p className="text-xs text-base-content/70">
                Digital Artist | Character Designer
              </p>
            </div>
          </div>

          {/* Menus / Icons */}
          <div className="hidden sm:flex items-center gap-5 text-base-content text-lg">
            <a href="#">
              <FontAwesomeIcon
                icon={faCommentDots}
                className="hover:text-primary transition-colors"
              />
            </a>
            <a href="#">
              <FontAwesomeIcon
                icon={faBell}
                className="hover:text-primary transition-colors"
              />
            </a>
            <a href="#">
              <FontAwesomeIcon
                icon={faTrophy}
                className="hover:text-primary transition-colors"
              />
            </a>
            <a href="#">
              <FontAwesomeIcon
                icon={faQuestionCircle}
                className="hover:text-primary transition-colors"
              />
            </a>
            <a href="#">
              <FontAwesomeIcon
                icon={faCog}
                className="hover:text-primary transition-colors"
              />
            </a>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 px-4 lg:px-12 py-6">
        {/* LEFT SIDEBAR */}
        <aside className="lg:col-span-2 hidden lg:flex flex-col gap-4">
          <nav className="flex flex-col gap-2">
            <Link
              to="/home"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-base-200 text-base-content transition-colors"
            >
              Home
            </Link>
            <Link
              to="/gallery"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-base-200 text-base-content transition-colors"
            >
              Gallery
            </Link>
            <Link
              to="/collective"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-base-200 text-base-content transition-colors"
            >
              Collective
            </Link>
            <Link
              to="/profile"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-base-200 text-base-content transition-colors"
            >
              Profile
            </Link>
            <button
              className="mt-2 px-3 py-2 rounded-lg bg-primary text-primary-content font-medium hover:bg-primary/80 hover:scale-105 active:scale-95 transition-all duration-200 shadow hover:shadow-md"
              onClick={() => setShowPostForm(true)}
            >
              Create Post
            </button>
          </nav>

          <LogoutButton />
        </aside>

        {/* FEED / POSTS */}
        <main className="lg:col-span-7">
          {/* Post Form Modal */}
          {showPostForm && <PostFormModal />}

          {showCommentForm && <CommentFormModal />}

          {/* Posts Section */}
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-base-content">Posts</h2>
            </div>

            {loading && posts.length === 0 && (
              <div className="text-center py-8">
                <div className="loading loading-spinner loading-lg"></div>
                <p className="mt-2 text-base-content">Loading posts...</p>
              </div>
            )}

            <div className="flex flex-col items-center">
              {posts.map((postItem) => (
                <div
                  key={postItem.post_id}
                  className="rounded-2xl p-6 w-full max-w-2xl"
                >
                  <div className="card-body">
                    {/* Post Header */}
                    <div className="flex items-start justify-between mb-3">
                      {/* Left side: Avatar + Info */}
                      <div className="flex items-center gap-3">
                        <img
                          src={postItem.author_picture}
                          alt="avatar"
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <h4 className="font-semibold text-sm">{postItem.author_fullname}</h4>
                          <p className="text-xs text-gray-500">
                            @{postItem.author_username}
                          </p>
                          <p className="text-xs text-blue-600">
                            {formatArtistTypesToString(postItem.author_artist_types)}
                          </p>
                        </div>
                      </div>

                      {/* Right side: Options button */}
                      <button className="btn btn-ghost btn-sm">⋮</button>
                    </div>

                    {/* Post Content */}
                    <p className="mb-3">{postItem.description}</p>

                    {/* Media */}
                    {postItem.post_type === "image" && postItem.image_url && (
                      <img
                        src={postItem.image_url}
                        alt={postItem.description}
                        className="rounded-lg w-full max-h-96 object-cover mb-3"
                      />
                    )}

                    {postItem.post_type === "video" && postItem.video_url && (
                      <video
                        controls
                        className="rounded-lg w-full max-h-96 mb-3"
                      >
                        <source src={postItem.video_url} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    )}

                    {postItem.post_type === "novel" &&
                      postItem.novel_post?.length > 0 && (
                        <div className="bg-base-200 p-3 rounded-lg mb-3">
                          <p className="font-semibold">
                            Chapters: {postItem.novel_post.length}
                          </p>
                          {postItem.novel_post
                            .slice(0, 1)
                            .map((novelPost, index) => (
                              <div key={index} className="mt-2">
                                <p className="text-sm font-medium">
                                  Chapter {novelPost.chapter}
                                </p>
                                <p className="text-sm">
                                  {novelPost.content?.substring(0, 120)}...
                                </p>
                              </div>
                            ))}
                          {postItem.novel_post.length > 1 && (
                            <p className="text-sm text-gray-500 mt-2">
                              +{postItem.novel_post.length - 1} more chapters...
                            </p>
                          )}
                        </div>
                      )}

                    {/* Post Actions - Add Heart Button */}
                    <div className="flex items-center justify-between mt-4 border-t border-base-300 pt-3">
                      <div className="flex items-center gap-2">
                        <HeartButton
                          postId={postItem.post_id}
                          heartsCount={postItem.hearts_count || 0}
                          isHearted={postItem.is_hearted_by_user || false}
                          onHeart={heartPost}
                          onUnheart={unheartPost}
                          isLoading={loadingHearts[postItem.post_id]}
                          size="sm"
                        />

                        {/* Comments Toggle Button */}
                        <button
                          className="btn btn-sm btn-ghost gap-2"
                          onClick={() => toggleComments(postItem.post_id)}
                          disabled={loadingComments[postItem.post_id]}
                        >
                          <FontAwesomeIcon icon={faCommentDots} />
                          {loadingComments[postItem.post_id] ? (
                            <div className="loading loading-spinner loading-xs"></div>
                          ) : (
                            <span>
                              {commentPagination[postItem.post_id]
                                ?.totalCount ||
                                getCommentsForPost(postItem.post_id, comments)
                                  .length}
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Edit/Delete Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setupEditPost(postItem)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-error"
                          onClick={() => deletePost(postItem.post_id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Comments Section */}
                    {expandedPost === postItem.post_id && (
                      <CommentsRenderer postId={postItem.post_id} />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {posts.length === 0 && !loading && (
              <div className="text-center py-8 text-base-content/70">
                No posts found. Be the first to create one!
              </div>
            )}

            <PostLoadingIndicator observerTarget={observerTarget} />
          </div>
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="lg:col-span-3 hidden lg:flex flex-col gap-6">
          <div>
            <h3 className="text-lg font-bold mb-2 text-base-content">
              Popular This Week
            </h3>
            <div className="rounded-lg overflow-hidden shadow-sm">
              <img
                src="/images/popular-art.jpg"
                alt="Popular Artwork"
                className="w-full object-cover"
              />
            </div>
          </div>

          <div className="bg-base-200 rounded-lg p-4 text-center text-base-content/70">
            Advertisement
          </div>

          <div>
            <h3 className="text-lg font-bold mb-2 text-base-content">
              Active Fellows
            </h3>
            <ul className="flex flex-col gap-3">
              <li className="flex items-center gap-3">
                <img
                  src="https://randomuser.me/api/portraits/women/1.jpg"
                  className="w-8 h-8 rounded-full"
                />
                <p className="text-sm text-base-content">Lisa Wong</p>
              </li>
              <li className="flex items-center gap-3">
                <img
                  src="https://randomuser.me/api/portraits/men/2.jpg"
                  className="w-8 h-8 rounded-full"
                />
                <p className="text-sm text-base-content">Michael Brown</p>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Index;
