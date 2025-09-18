import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '@context/auth-context';
import { LogoutButton } from '@components/account/logout';
import { CommentFormModal, PostFormModal } from '@components/common/modal'
import { getCommentsForPost } from '@utils';
import usePostComment from '@hooks/use-post-comment';
import usePost from '@hooks/use-post';
import { PostLoadingIndicator, CommentsRenderer } from '@components/common';
import axios from 'axios';
import { usePostContext } from '@context/post-context';

const Index: React.FC = () => {
  const { user } = useAuth();
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
  const { toggleComments } = usePostComment()
  const { setupEditPost } = usePost()

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

  // Handle API errors
  const handleApiError = (error: unknown, defaultMessage: string) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 403) toast.error('You do not have permission');
      else if (status === 404) toast.error('Not found');
      else if (status === 400) toast.error('Invalid data');
      else if (status === 500) toast.error('Server error');
      else toast.error(`Error: ${status || 'Unknown'}`);
    } else {
      toast.error(defaultMessage);
    }
    console.error(defaultMessage, error);
  };

  return (
    <div className="container mx-auto p-4">
      <div className='mb-8'>
        <h1 className="text-3xl font-bold">Home Page Mock-up</h1>
        <h2>Posts + Comments</h2>
      </div>
      <p className='text-xl font-semibold'>Welcome, {user?.username || 'Guest'}!</p>
      
      <nav className='flex-col flex gap-1 mb-2'>
        <Link to='/profile' className='btn btn-accent'>Profile</Link>
        <Link to='/collective' className='btn btn-accent'>Collective</Link>
        <Link to='/gallery' className='btn btn-accent'>Gallery</Link>
      </nav>

      <LogoutButton />
      
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
          <button className="btn btn-primary" onClick={() => setShowPostForm(true)}>
            Create Post
          </button>
        </div>
        
        {loading && posts.length === 0 && (
          <div className="text-center py-8">
            <div className="loading loading-spinner loading-lg"></div>
            <p className="mt-2">Loading posts...</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map(postItem => (
            <div key={postItem.post_id} className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title">{postItem.description?.substring(0, 30)}...</h3>
                <p>Id: {postItem.post_id}</p>
                <p>Type: {postItem.post_type}</p>
                <p>Author: {postItem.author}</p>
                <p>Created: {new Date(postItem.created_at).toLocaleDateString()}</p>
                
                {postItem.post_type === 'image' && postItem.image_url && (
                  <div className="mt-4">
                    <img 
                      src={postItem.image_url} 
                      alt={postItem.description} 
                      className="rounded-lg max-h-48 object-cover"
                    />
                  </div>
                )}
                
                {postItem.post_type === 'video' && postItem.video_url && (
                  <div className="mt-4">
                    <video controls className="rounded-lg max-h-48 w-full">
                      <source src={postItem.video_url} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}
                
                {postItem.post_type === 'novel' && postItem.novel_post && postItem.novel_post.length > 0 && (
                  <div className="mt-4">
                    <p className="font-semibold">Chapters: {postItem.novel_post.length}</p>
                    {postItem.novel_post.slice(0, 3).map((novelPost, index) => (
                      <div key={index} className="mt-2 p-2 bg-base-200 rounded">
                        <p className="text-sm font-medium">Chapter {novelPost.chapter}</p>
                        <p className="text-sm mt-1">{novelPost.content?.substring(0, 80)}...</p>
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
    </div>
  );
};

export default Index;