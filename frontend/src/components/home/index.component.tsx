import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { LogoutButton } from '@components/account/logout';
import { CommentFormModal, PostFormModal } from '@components/common/posts-feature/modal'
import usePost from '@hooks/use-post';
import { PostLoadingIndicator, CommentsRenderer } from '@components/common';
import { usePostContext } from '@context/post-context';
import { getCommentsForPost } from '@utils';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCommentDots,
  faBell,
  faTrophy,
  faQuestionCircle,
  faCog,
} from "@fortawesome/free-solid-svg-icons";
const Index: React.FC = () => {
  const { 
    comments, loadingComments, 
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
  } = usePostContext()
  const { setupEditPost, toggleComments } = usePost()

  const observerTarget = useRef<HTMLDivElement>(null)

  // Infinite scrolling behavior
  useEffect(() => {
    let isFetching = false

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          pagination.hasNext &&
          !loadingMore && 
          !loading &&
          !isFetching
        ) {
          isFetching = true
          fetchPosts(pagination.currentPage + 1, true)
            .finally(() => {
              isFetching = false  // Reset flag after fetch completes
            })
        }
      }, { threshold: 0.5 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
      observer.disconnect()
    }
  }, [pagination.hasNext, loadingMore, loading, fetchPosts, pagination.currentPage])

  useEffect(() => {
    setLoading(false)
    setLoadingMore(false)
  }, [])

  useEffect(() => {
    fetchPosts(1);
  }, [fetchPosts]);

  return (
    /*container div */
    <div className="container mx-auto p-4">
    
      <div className="flex items-center justify-between bg-white px-6 py-3 shadow">

          {/* Logo */}
          <h2 className="text-xl font-bold text-purple-600">ArtChive</h2>

          {/* Search Bar */}
          <div className="flex-1 mx-6">
            <input
              type="text"
              placeholder="Search artists, artworks, collectives..."
              className="w-full max-w-lg px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-8">

              {/* User Profile */}
              <div className="flex items-center gap-3">

                    <Link to="/profile"><img
                      src="https://randomuser.me/api/portraits/men/75.jpg"
                      alt="Chenoborg"
                      className="w-10 h-10 rounded-full border"
                    /></Link>

              <div>

            <Link to="/profile"><h5 className="text-sm font-semibold text-gray-800">Chenoborg</h5></Link>
            <p className="text-xs text-purple-600">@chenoborg_art</p>
            <p className="text-xs text-gray-500">
              Digital Artist | Character Designer
            </p>
            
          </div>

        </div>

        {/* Menus / Icons */}
        <div className="flex items-center gap-5 text-gray-700 text-lg">
          <a href="#">
            <FontAwesomeIcon icon={faCommentDots} className="hover:text-purple-600" />
          </a>
          <a href="#">
            <FontAwesomeIcon icon={faBell} className="hover:text-purple-600" />
          </a>
          <a href="#">
            <FontAwesomeIcon icon={faTrophy} className="hover:text-purple-600" />
          </a>
          <a href="#">
            <FontAwesomeIcon icon={faQuestionCircle} className="hover:text-purple-600" />
          </a>
          <a href="#">
            <FontAwesomeIcon icon={faCog} className="hover:text-purple-600" />
          </a>
        </div>
      </div>
    </div>

      
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 px-4 lg:px-12 py-6">
  {/* LEFT SIDEBAR */}
  <aside className="lg:col-span-2 hidden lg:flex flex-col gap-4">
    <nav className="flex flex-col gap-2">
      <Link to='/home' className='flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-purple-50 text-gray-700'>
         Home
      </Link>
      <Link to='/gallery' className='flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-purple-50 text-gray-700'>
         Gallery
      </Link>
      <Link to='/collective' className='flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-purple-50 text-gray-700'>
         Collective
      </Link>
      <button
        className="mt-2 px-3 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition"
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
    {showPostForm && (
      <PostFormModal />
    )}

    {showCommentForm &&
      <CommentFormModal />
    }

    {/* Posts Section */}
    <div className="mb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Posts</h2>
      </div>

      {loading && posts.length === 0 && (
        <div className="text-center py-8">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-2">Loading posts...</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {posts.map(postItem => (
          <div key={postItem.post_id} className="card bg-white border rounded-xl shadow-sm hover:shadow-md transition">
            <div className="card-body">
              <h3 className="card-title text-lg font-semibold text-gray-800">
                {postItem.description?.substring(0, 30)}...
              </h3>
              <p className="text-sm text-gray-500">Id: {postItem.post_id}</p>
              <p className="text-sm text-gray-500">Type: {postItem.post_type}</p>
              <p className="text-sm text-gray-500">Author: {postItem.author}</p>
              <p className="text-sm text-gray-500">Created: {new Date(postItem.created_at).toLocaleDateString()}</p>

              {postItem.post_type === 'image' && postItem.image_url && (
                <div className="mt-4">
                  <img
                    src={postItem.image_url}
                    alt={postItem.description}
                    className="rounded-lg w-full max-h-64 object-cover"
                  />
                </div>
              )}

              {postItem.post_type === 'video' && postItem.video_url && (
                <div className="mt-4">
                  <video controls className="rounded-lg w-full max-h-64">
                    <source src={postItem.video_url} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}

              {postItem.post_type === 'novel' && postItem.novel_post && postItem.novel_post.length > 0 && (
                <div className="mt-4">
                  <p className="font-semibold">Chapters: {postItem.novel_post.length}</p>
                  {postItem.novel_post.slice(0, 3).map((novelPost, index) => (
                    <div key={index} className="mt-2 p-2 bg-gray-100 rounded">
                      <p className="text-sm font-medium">Chapter {novelPost.chapter}</p>
                      <p className="text-sm mt-1 text-gray-600">{novelPost.content?.substring(0, 80)}...</p>
                    </div>
                  ))}
                  {postItem.novel_post.length > 3 && (
                    <p className="text-sm text-gray-500 mt-2">
                      +{postItem.novel_post.length - 3} more chapters...
                    </p>
                  )}
                </div>
              )}

              {/* Comments Toggle Button */}
              <div className="mt-4">
                <button
                  className="btn btn-sm btn-outline w-full"
                  onClick={() => toggleComments(postItem.post_id)}
                  disabled={loadingComments[postItem.post_id]}
                >
                  {loadingComments[postItem.post_id] ? (
                    <>
                      <div className="loading loading-spinner loading-xs"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      {expandedPost === postItem.post_id ? 'Hide' : 'Show'} Comments (
                      {commentPagination[postItem.post_id]?.totalCount ||
                        getCommentsForPost(postItem.post_id, comments).length})
                    </>
                  )}
                </button>
              </div>

              {/* Comments Section */}
              {expandedPost === postItem.post_id &&
                <CommentsRenderer postId={postItem.post_id} />
              }

              <div className="card-actions justify-end mt-4">
                <button className="btn btn-sm btn-secondary" onClick={() => setupEditPost(postItem)}>
                  Edit
                </button>
                <button className="btn btn-sm btn-error" onClick={() => deletePost(postItem.post_id)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {posts.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          No posts found. Be the first to create one!
        </div>
      )}

      <PostLoadingIndicator observerTarget={observerTarget} />
    </div>
  </main>

  {/* RIGHT SIDEBAR */}
  <aside className="lg:col-span-3 hidden lg:flex flex-col gap-6">
    <div>
      <h3 className="text-lg font-bold mb-2">Popular This Week</h3>
      <div className="rounded-lg overflow-hidden shadow-sm">
        <img src="/images/popular-art.jpg" alt="Popular Artwork" className="w-full object-cover" />
      </div>
    </div>

    <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-500">
      Advertisement
    </div>

    <div>
      <h3 className="text-lg font-bold mb-2">Active Fellows</h3>
      <ul className="flex flex-col gap-3">
        <li className="flex items-center gap-3">
          <img src="https://randomuser.me/api/portraits/women/1.jpg" className="w-8 h-8 rounded-full" />
          <p className="text-sm text-gray-700">Lisa Wong</p>
        </li>
        <li className="flex items-center gap-3">
          <img src="https://randomuser.me/api/portraits/men/2.jpg" className="w-8 h-8 rounded-full" />
          <p className="text-sm text-gray-700">Michael Brown</p>
        </li>
      </ul>
    </div>
  </aside>
</div>


    </div>
  );
};

export default Index;