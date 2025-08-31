import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { post } from '@lib/api';
import { toast } from 'react-toastify';
import { useAuth } from '@context/auth-context';
import type { Post, Comment } from '@types';
import axios from 'axios';

const Timeline: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [postComments, setPostComments] = useState<{ [postId: string]: Comment[] }>({})
  const [loadingComments, setLoadingComments] = useState<{[postId: string]: boolean}>({});

  const { user, getUserId } = useAuth();

  // Pagination states
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalCount: 0,
    hasNext: false,
    hasPrevious: false
  });

  const [commentPagination, setCommentPagination] = useState<{
      [postId: string]: {
        currentPage: number;
        hasNext: boolean;
        hasPrevious: boolean;
        totalCount: number;
      }
    }>({});

  const observerTarget = useRef<HTMLDivElement>(null);

  // Form states
  const [postForm, setPostForm] = useState({
    description: '',
    post_type: 'default',
    image_url: null as File | null,
    video_url: null as File | null,
    chapters: [{ chapter: '', content: '' }],
  });

  const [commentForm, setCommentForm] = useState({
    text: '',
    post_id: ''
  });

  // Fetch data functions
  const fetchPosts = useCallback(async (
    page: number = 1,
    append: boolean = false
  ) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      if (user == null) {
        toast.error('You must be logged in to fetch posts')
        return
      }

      // Only fetch posts for the current user
      const response = await post.get(`me/${user.id}/`, {
        params: { 
          page, 
          page_size: 10
        }
      });

      if (append) {
        setPosts(prev => [...prev, ...response.data.results]);
      } else {
        setPosts(response.data.results || []);
      }

      setPagination(prev => ({
        ...prev,
        currentPage: page,
        totalCount: response.data.count,
        hasNext: response.data.next !== null,
        hasPrevious: response.data.previous !== null
      }));
    } catch (error) {
      toast.error('Failed to fetch posts');
      console.error(error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [getUserId]);

  // Infinite scrolling behavior
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          pagination.hasNext &&
          !loadingMore && !loading
        ) {
          fetchPosts(pagination.currentPage + 1, true);
        }
      }, { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
      observer.disconnect()
    };
  }, [pagination.hasNext, loadingMore, loading, fetchPosts]);

  const fetchCommentsForPost = useCallback(async (postId: string, page: number = 1, append: boolean = false) => {
      try {
        setLoadingComments(prev => ({ ...prev, [postId]: true }));
        
        const response = await post.get(`/comment/${postId}/`, {
          params: { page, page_size: 10 }
        });
        
        // Handle paginated response
        const commentsData = response.data.results || [];
        const paginationData = {
          currentPage: page,
          hasNext: response.data.next !== null,
          hasPrevious: response.data.previous !== null,
          totalCount: response.data.count || commentsData.length
        };
        
        setPostComments(prev => ({
          ...prev,
          [postId]: append 
            ? [...(prev[postId] || []), ...commentsData]
            : commentsData
        }));
        
        setCommentPagination(prev => ({
          ...prev,
          [postId]: paginationData
        }));
      } catch (error) {
        toast.error(`Failed to fetch comments for post ${postId}`);
        console.error(error);
      } finally {
        setLoadingComments(prev => ({ ...prev, [postId]: false }));
      }
    }, [postComments]);

  useEffect(() => {
    fetchPosts(1);
  }, [fetchPosts]);

  const refreshPosts = useCallback(() => {
    fetchPosts(1, false);
  }, [fetchPosts]);

  // Handle form changes
  const handlePostFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPostForm(prev => ({ ...prev, [name]: value }));
  };

  const handleChapterChange = (index: number, field: 'chapter' | 'content', value: string) => {
    const updatedChapters = [...postForm.chapters];
    updatedChapters[index] = { ...updatedChapters[index], [field]: value };
    setPostForm(prev => ({ ...prev, chapters: updatedChapters }));
  };

  const addChapter = () => {
    setPostForm(prev => ({
      ...prev,
      chapters: [...prev.chapters, { chapter: '', content: '' }]
    }));
  };

  const removeChapter = (index: number) => {
    if (postForm.chapters.length > 1) {
      const updatedChapters = postForm.chapters.filter((_, i) => i !== index);
      setPostForm(prev => ({ ...prev, chapters: updatedChapters }));
    }
  };

  const handlePostFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files?.[0]) setPostForm(prev => ({ ...prev, [name]: files[0] }));
  };

  const handleCommentFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCommentForm(prev => ({ ...prev, [name]: value }));
  };

  // Auth check helper
  const checkAuth = useCallback(() => {
    if (!user) {
      toast.error('You must be logged in to perform this action');
      return false;
    }
    if (!getUserId()) {
      toast.error('User ID is not available');
      return false;
    }
    return true;
  }, [user, getUserId]);

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

  // Post operations
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkAuth()) return;

    try {
      const formData = new FormData();
      formData.append('description', postForm.description);
      formData.append('post_type', postForm.post_type);
      
      if (postForm.image_url) formData.append('image_url', postForm.image_url);
      if (postForm.video_url) formData.append('video_url', postForm.video_url);
      
      if (postForm.post_type === 'novel') {
        postForm.chapters.forEach((chapter, index) => {
          formData.append(`chapters[${index}].chapter`, chapter.chapter);
          formData.append(`chapters[${index}].content`, chapter.content);
        });
      }

      const url = editing ? `/update/${selectedPost?.post_id}/` : '/create/';
      const method = editing ? 'put' : 'post';
      
      await post[method](url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      toast.success(`Post ${editing ? 'updated' : 'created'} successfully`);
      setShowPostForm(false);
      setEditing(false);
      setSelectedPost(null);
      setPostForm({
        description: '',
        post_type: 'default',
        image_url: null,
        video_url: null,
        chapters: [{ chapter: '', content: '' }]
      });
      
      refreshPosts();
    } catch (error) {
      handleApiError(error, `Failed to ${editing ? 'update' : 'create'} post`);
    }
  };

  const deletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?') || !checkAuth()) return;
    
    try {
      await post.delete(`/delete/${postId}/`, { data: { confirm: true } });
      toast.success('Post deleted successfully');
      
      // Refresh posts (could optimize by filtering locally)
      refreshPosts();
    } catch (error) {
      handleApiError(error, 'Failed to delete post');
    }
  };

  // Render loading indicators for infinite scroll
  const renderLoadingIndicator = () => {
    if (loadingMore) {
      return (
        <div className="flex justify-center py-4">
          <div className="loading loading-spinner loading-lg"></div>
          <span className="ml-2">Loading more posts...</span>
        </div>
      );
    }

    if (pagination.hasNext && !loadingMore) {
      return (
        <div ref={observerTarget} className="h-10 flex justify-center items-center">
          <div className="loading loading-spinner"></div>
        </div>
      );
    }

    if (!pagination.hasNext && posts.length > 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          You've reached the end! {pagination.totalCount} posts total.
        </div>
      );
    }

    return null;
  };

  const getCommentsForPost = (postId: string) => {
    return postComments[postId] || [];
  };

  const toggleComments = async (postId: string) => {
    if (expandedPost !== postId) {
      // Fetch first page when expanding a post
      await fetchCommentsForPost(postId, 1, false);
    }
    setExpandedPost(expandedPost === postId ? null : postId);
  };

  const loadMoreComments = async (postId: string) => {
    const pagination = commentPagination[postId];
    if (pagination && pagination.hasNext) {
      await fetchCommentsForPost(postId, pagination.currentPage + 1, true);
    }
  };

  // Comment operations
  const handleCommentSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!checkAuth()) return;
    
      try {
        if (editing) {
          await post.put(`/comment/update/${selectedComment?.comment_id}/`, {
            text: commentForm.text
          });
        } else {
          await post.post('/comment/create/', commentForm);
        }
        
        toast.success(`Comment ${editing ? 'updated' : 'created'} successfully`);
        setShowCommentForm(false);
        setEditing(false);
        setSelectedComment(null);
        setCommentForm({ text: '', post_id: '' });
        
        // Refresh comments for the specific post (first page)
        if (commentForm.post_id) {
          await fetchCommentsForPost(commentForm.post_id, 1, false);
        }
      } catch (error) {
        handleApiError(error, `Failed to ${editing ? 'update' : 'create'} comment`);
      }
    };
  
    const deleteComment = async (commentId: string, postId: string) => {
      if (!window.confirm('Are you sure you want to delete this comment?') || !checkAuth()) return;
      
      try {
        await post.delete(`/comment/delete/${commentId}/`, { data: { confirm: true } });
        toast.success('Comment deleted successfully');
        
        // Refresh comments for the specific post (current page)
        const currentPage = commentPagination[postId]?.currentPage || 1;
        await fetchCommentsForPost(postId, currentPage, false);
      } catch (error) {
        handleApiError(error, 'Failed to delete comment');
      }
    };

  const setupNewComment = (postId: string) => {
    setCommentForm({ text: '', post_id: postId });
    setEditing(false);
    setSelectedComment(null);
    setShowCommentForm(true);
  };

  // Setup edit forms
  const setupEditPost = (postItem: Post) => {
    setSelectedPost(postItem);
    setPostForm({
      description: postItem.description,
      post_type: postItem.post_type,
      image_url: null,
      video_url: null,
      chapters: postItem.novel_post?.map(np => ({
        chapter: np.chapter.toString(),
        content: np.content
      })) || [{ chapter: '', content: '' }]
    });
    setEditing(true);
    setShowPostForm(true);
  };

  const setupEditComment = (comment: Comment) => {
    setSelectedComment(comment);
    setCommentForm({
      text: comment.text,
      post_id: comment.post_id
    });
    setEditing(true);
    setShowCommentForm(true);
  };

  // Form reset
  const resetForms = () => {
    setShowPostForm(false);
    setShowCommentForm(false);
    setEditing(false);
    setSelectedPost(null);
    setSelectedComment(null);
    setPostForm({
      description: '',
      post_type: 'default',
      image_url: null,
      video_url: null,
      chapters: [{ chapter: '', content: '' }]
    });
    setCommentForm({ text: '', post_id: '' });
  };

  // Render functions
  const renderChapterFields = () => (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Chapters</h3>
        <button type="button" className="btn btn-sm btn-primary" onClick={addChapter}>
          Add Chapter
        </button>
      </div>
      
      {postForm.chapters.map((chapter, index) => (
        <div key={index} className="card bg-base-200 p-4 mb-4">
          {postForm.chapters.length > 1 && (
            <div className="flex justify-end mb-2">
              <button type="button" className="btn btn-sm btn-error" onClick={() => removeChapter(index)}>
                Remove
              </button>
            </div>
          )}
          
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Chapter Number</span>
            </label>
            <input 
              type="number"
              className="input input-bordered"
              value={chapter.chapter}
              onChange={(e) => handleChapterChange(index, 'chapter', e.target.value)}
              min="1"
              required
            />
          </div>
          
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Content</span>
            </label>
            <textarea 
              className="textarea textarea-bordered h-32"
              value={chapter.content}
              onChange={(e) => handleChapterChange(index, 'content', e.target.value)}
              required
            />
          </div>
        </div>
      ))}
    </div>
  );

  const renderMediaField = () => {
    if (postForm.post_type === 'image') {
      return (
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Image</span>
          </label>
          <input 
            type="file"
            className="file-input file-input-bordered"
            name="image_url"
            onChange={handlePostFileChange}
            accept="image/*"
            required={!editing}
          />
        </div>
      );
    }
    
    if (postForm.post_type === 'video') {
      return (
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Video</span>
          </label>
          <input 
            type="file"
            className="file-input file-input-bordered"
            name="video_url"
            onChange={handlePostFileChange}
            accept="video/*"
            required={!editing}
          />
        </div>
      );
    }
    
    return null;
  };

  // Render comments for a post
  const renderComments = (postId: string) => {
    const comments = getCommentsForPost(postId);
    const isLoading = loadingComments[postId];
    const pagination = commentPagination[postId];
    
    return (
      <div className="mt-4 border-t pt-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-semibold">
            Comments ({isLoading ? '...' : pagination?.totalCount || comments.length})
          </h4>
          <button 
            className="btn btn-sm btn-primary"
            onClick={() => setupNewComment(postId)}
          >
            Add Comment
          </button>
        </div>
        
        {isLoading && comments.length === 0 ? (
          <div className="text-center py-4">
            <div className="loading loading-spinner loading-sm"></div>
            <span className="ml-2">Loading comments...</span>
          </div>
        ) : comments.length === 0 ? (
          <p className="text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
        ) : (
          <>
            <div className="space-y-3">
              {comments.map(comment => (
                <div key={comment.comment_id} className="bg-base-200 p-3 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{comment.author_username}</p>
                      <p className="text-sm">{comment.text}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      <button 
                        className="btn btn-xs btn-secondary"
                        onClick={() => setupEditComment(comment)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-xs btn-error"
                        onClick={() => deleteComment(comment.comment_id, postId)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Load More Button */}
            {pagination?.hasNext && (
              <div className="mt-4 text-center">
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => loadMoreComments(postId)}
                  disabled={loadingComments[postId]}
                >
                  {loadingComments[postId] ? (
                    <>
                      <div className="loading loading-spinner loading-xs"></div>
                      Loading more...
                    </>
                  ) : (
                    `Load More (${comments.length} of ${pagination.totalCount})`
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4">
      <div className='mb-8'>
        <h1 className="text-3xl font-bold">Timeline</h1>
        <h2>Your Posts</h2>
      </div>
      
      <Link to='/profile/me' className='btn btn-secondary mb-4'>Edit profile</Link>
      
      {/* Post Form Modal */}
      {showPostForm && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h2 className="text-2xl font-bold mb-4">{editing ? 'Edit Post' : 'Create Post'}</h2>
            <form onSubmit={handlePostSubmit}>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Description</span>
                </label>
                <textarea 
                  className="textarea textarea-bordered h-24"
                  name="description"
                  value={postForm.description}
                  onChange={handlePostFormChange}
                />
              </div>
              
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Post Type</span>
                </label>
                <select 
                  className="select select-bordered"
                  name="post_type"
                  value={postForm.post_type}
                  onChange={handlePostFormChange}
                  required
                >
                  <option value="default">Default</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="novel">Novel</option>
                </select>
              </div>
              
              {renderMediaField()}
              {postForm.post_type === 'novel' && renderChapterFields()}
              
              <div className="modal-action">
                <button type="submit" className="btn btn-primary">
                  {editing ? 'Update' : 'Create'}
                </button>
                <button type="button" className="btn" onClick={resetForms}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Comment Form Modal */}
      {showCommentForm && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h2 className="text-2xl font-bold mb-4">{editing ? 'Edit Comment' : 'Create Comment'}</h2>
            <form onSubmit={handleCommentSubmit}>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Comment Text</span>
                </label>
                <textarea 
                  className="textarea textarea-bordered h-24"
                  name="text"
                  value={commentForm.text}
                  onChange={handleCommentFormChange}
                  required
                />
              </div>
              
              {!editing && (
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text">Post ID</span>
                  </label>
                  <input 
                    type="text"
                    className="input input-bordered"
                    name="post_id"
                    value={commentForm.post_id}
                    onChange={handleCommentFormChange}
                    placeholder="Enter post ID to comment on"
                    required
                  />
                </div>
              )}
              
              <div className="modal-action">
                <button type="submit" className="btn btn-primary">
                  {editing ? 'Update' : 'Create'}
                </button>
                <button type="button" className="btn" onClick={resetForms}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Posts Section */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Your Posts</h2>
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
                      {getCommentsForPost(postItem.post_id).length})
                    </>
                  )}
                </button>
                </div>

                {/* Comments Section */}
                {expandedPost === postItem.post_id && renderComments(postItem.post_id)}

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
            No posts found. Create your first post!
          </div>
        )}
        
        {renderLoadingIndicator()}
      </div>
    </div>
  );
};

export default Timeline;