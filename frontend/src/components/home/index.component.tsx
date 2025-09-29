import React, { useEffect, useRef, useState } from "react";
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
  faEllipsisH,
  faBookmark,
  faPaperPlane,
  faEdit,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import HeartButton from "@components/common/posts-feature/heart-button";
import { formatArtistTypesToString } from "@utils";
import { useAuth } from "@context/auth-context";

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
  const { setupEditPost, toggleComments, dropdownOpen, handleDeletePost, handleEditPost, toggleDropdown } = usePost();
  const { user } = useAuth()

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
                src={user?.profile_picture}
                alt="Chenoborg"
                className="w-10 h-10 rounded-full border border-base-300"
              />
            </Link>

            <div className="hidden md:block">
              <Link to="/profile">
                <h5 className="text-sm font-semibold text-base-content">
                  {user?.fullname}
                </h5>
              </Link>
              <p className="text-xs text-primary">@{user?.username}</p>
              <p className="text-xs text-base-content/70">
                {formatArtistTypesToString(user?.artist_types)}
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

            <div className="flex flex-col gap-8 max-w-2xl mx-auto">
              {posts.map((postItem) => (
                <div
                  key={postItem.post_id}
                  className="card bg-base-100 border border-base-300 rounded-xl shadow-sm"
                >
                  {/* Post Header - Instagram Style */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
                    <div className="flex items-center gap-3">
                      <img
                        src={postItem.author_picture}
                        alt="Chenoborg"
                        className="w-8 h-8 rounded-full border border-base-300"
                      />
                      <div>
                        <p className="text-sm font-semibold text-base-content">
                          {postItem.author_fullname}
                        </p>
                        <p className="text-xs text-base-content/70">
                          {formatArtistTypesToString(
                            postItem.author_artist_types
                          )}
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
                              className="text-sm flex items-center gap-2"
                              onClick={() => handleEditPost(postItem)}
                            >
                              <FontAwesomeIcon icon={faEdit} />
                              Edit
                            </button>
                          </li>
                          <li>
                            <button 
                              className="text-sm text-error flex items-center gap-2"
                              onClick={() => handleDeletePost(postItem.post_id)}
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
                  {postItem.post_type === 'image' && postItem.image_url && (
                    <div className="aspect-square bg-black flex items-center justify-center">
                      <img
                        src={postItem.image_url}
                        alt={postItem.description}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  {postItem.post_type === 'video' && postItem.video_url && (
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

                  {postItem.post_type === 'novel' && postItem.novel_post && postItem.novel_post.length > 0 && (
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
                          onClick={() => toggleComments(postItem.post_id)}
                          disabled={loadingComments[postItem.post_id]}
                        >
                          <FontAwesomeIcon 
                            icon={faCommentDots} 
                            className="text-xl hover:scale-110 transition-transform" 
                          />
                        </button>

                        <button className="btn btn-ghost btn-sm btn-circle">
                          <FontAwesomeIcon 
                            icon={faPaperPlane} 
                            className="text-xl hover:scale-110 transition-transform" 
                          />
                        </button>
                      </div>

                      <button className="btn btn-ghost btn-sm btn-circle">
                        <FontAwesomeIcon 
                          icon={faBookmark} 
                          className="text-xl hover:scale-110 transition-transform" 
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
                          <span className="font-semibold">chenoborg_art</span>{" "}
                          {postItem.description}
                        </p>
                      </div>
                    )}

                    {/* View Comments */}
                    {getCommentsForPost(postItem.post_id, comments).length > 0 && (
                      <button
                        className="text-sm text-base-content/70 mb-2 hover:text-base-content transition-colors"
                        onClick={() => toggleComments(postItem.post_id)}
                      >
                        View all {getCommentsForPost(postItem.post_id, comments).length} comments
                      </button>
                    )}

                    {/* Time Posted */}
                    <p className="text-xs text-base-content/50 uppercase">
                      {new Date(postItem.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>

                  {/* Comments Section */}
                  {expandedPost === postItem.post_id && (
                    <div className="border-t border-base-300">
                      <CommentsRenderer postId={postItem.post_id} />
                    </div>
                  )}
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