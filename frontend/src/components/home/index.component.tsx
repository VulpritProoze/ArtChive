import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { post } from '@lib/api';
import { toast } from 'react-toastify';
import { useAuth } from '@context/auth-context';
import { LogoutButton } from '@components/account/logout';
import axios from 'axios';
import type { Post, Comment } from '@types';

const Index: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [editing, setEditing] = useState(false);
  
  const { user, getUserId } = useAuth();

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
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await post.get('/');
      setPosts(response.data.results || response.data);
    } catch (error) {
      toast.error('Failed to fetch posts');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchComments = useCallback(async () => {
    try {
      const response = await post.get('/comment/');
      setComments(response.data.results || response.data);
    } catch (error) {
      toast.error('Failed to fetch comments');
      console.error(error);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchComments();
  }, [fetchPosts, fetchComments]);

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
      fetchPosts();
    } catch (error) {
      handleApiError(error, `Failed to ${editing ? 'update' : 'create'} post`);
    }
  };

  const deletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?') || !checkAuth()) return;
    
    try {
      await post.delete(`/delete/${postId}/`, { data: { confirm: true } });
      toast.success('Post deleted successfully');
      fetchPosts();
    } catch (error) {
      handleApiError(error, 'Failed to delete post');
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
      fetchComments();
    } catch (error) {
      handleApiError(error, `Failed to ${editing ? 'update' : 'create'} comment`);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?') || !checkAuth()) return;
    
    try {
      await post.delete(`/comment/delete/${commentId}/`, { data: { confirm: true } });
      toast.success('Comment deleted successfully');
      fetchComments();
    } catch (error) {
      handleApiError(error, 'Failed to delete comment');
    }
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
          <h2 className="text-2xl font-bold">Posts</h2>
          <button className="btn btn-primary" onClick={() => setShowPostForm(true)}>
            Create Post
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map(post => (
            <div key={post.post_id} className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title">{post.description.substring(0, 30)}...</h3>
                <p>Id: {post.post_id}</p>
                <p>Type: {post.post_type}</p>
                <p>Author: {post.author}</p>
                <p>Created: {new Date(post.created_at).toLocaleDateString()}</p>
                
                {post.post_type === 'image' && post.image_url && (
                  <div className="mt-4">
                    <img 
                      src={post.image_url} 
                      alt={post.description} 
                      className="rounded-lg max-h-48 object-cover"
                    />
                  </div>
                )}
                
                {post.post_type === 'video' && post.video_url && (
                  <div className="mt-4">
                    <video controls className="rounded-lg max-h-48 w-full">
                      <source src={post.video_url} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}
                
                {post.post_type === 'novel' && post.novel_post && post.novel_post.length > 0 && (
                  <div className="mt-4">
                    <p className="font-semibold">Chapters: {post.novel_post.length}</p>
                    {post.novel_post.slice(0, 3).map((novelPost, index) => (
                      <div key={index} className="mt-2 p-2 bg-base-200 rounded">
                        <p className="text-sm font-medium">Chapter {novelPost.chapter}</p>
                        <p className="text-sm mt-1">{novelPost.content.substring(0, 80)}...</p>
                      </div>
                    ))}
                    {post.novel_post.length > 3 && (
                      <p className="text-sm text-gray-500 mt-2">
                        +{post.novel_post.length - 3} more chapters...
                      </p>
                    )}
                  </div>
                )}
                
                <div className="card-actions justify-end mt-4">
                  <button className="btn btn-sm btn-secondary" onClick={() => setupEditPost(post)}>
                    Edit
                  </button>
                  <button className="btn btn-sm btn-error" onClick={() => deletePost(post.post_id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Comments Section */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Comments</h2>
          <button className="btn btn-primary" onClick={() => setShowCommentForm(true)}>
            Create Comment
          </button>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {comments.map(comment => (
            <div key={comment.comment_id} className="card bg-base-100 shadow">
              <div className="card-body">
                <h3 className="card-title">By: {comment.author_username}</h3>
                <p>Id: {comment.comment_id}</p>
                <p>On Post: {comment.post_id}</p>
                <p>{comment.text}</p>
                <p className="text-sm text-gray-500">
                  {new Date(comment.created_at).toLocaleString()}
                </p>
                
                <div className="card-actions justify-end mt-2">
                  <button className="btn btn-sm btn-secondary" onClick={() => setupEditComment(comment)}>
                    Edit
                  </button>
                  <button className="btn btn-sm btn-error" onClick={() => deleteComment(comment.comment_id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;