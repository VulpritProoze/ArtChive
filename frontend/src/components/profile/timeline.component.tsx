import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@context/auth-context';
import { usePostContext } from '@context/post-context';
import usePost from '@hooks/use-post';
import { PostFormModal, CommentFormModal } from '@components/common/posts-feature/modal';
import { PostLoadingIndicator, CommentsRenderer } from '@components/common';
import { getCommentsForPost } from '@utils';

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
          fetchPosts(pagination.currentPage + 1, true, null, user?.id)
            .finally(() => {
              isFetching = false;  // Reset flag after fetch completes
            });
        }
      }, { threshold: 0.5 }
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
  }, [pagination.hasNext, loadingMore, loading, fetchPosts, pagination.currentPage]);

  useEffect(() => {
    fetchPosts(1, false, null, user?.id);
  }, [fetchPosts]);

  return (
    <div className="container mx-auto p-4">
      <div className='mb-8'>
        <h1 className="text-3xl font-bold">Timeline</h1>
        <h2 className="text-xl text-gray-600">Your Posts</h2>
      </div>
      
      <Link to='/profile/me' className='btn btn-secondary mb-4'>Edit profile</Link>
      
      {/* Post Form Modal */}
      {showPostForm && <PostFormModal />}
      
      {/* Comment Form Modal */}
      {showCommentForm && <CommentFormModal />}
      
      {/* Posts Section */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Your Posts</h2>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowPostForm(true)}
          >
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
                <p className="text-sm text-gray-500">Id: {postItem.post_id}</p>
                <p className="text-sm text-gray-500">Type: {postItem.post_type}</p>
                <p className="text-sm text-gray-500">Author: {postItem.author}</p>
                <p className="text-sm text-gray-500">Created: {new Date(postItem.created_at).toLocaleDateString()}</p>
                
                {postItem.post_type === 'image' && postItem.image_url && (
                  <div className="mt-4">
                    <img 
                      src={postItem.image_url} 
                      alt={postItem.description} 
                      className="rounded-lg max-h-48 object-cover w-full"
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
                {expandedPost === postItem.post_id && (
                  <CommentsRenderer postId={postItem.post_id} />
                )}

                <div className="card-actions justify-end mt-4">
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
            </div>
          ))}
        </div>
        
        {posts.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            No posts found. Create your first post!
          </div>
        )}
        
        <PostLoadingIndicator observerTarget={observerTarget} />
      </div>
    </div>
  );
};

export default Timeline;