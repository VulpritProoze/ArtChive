import { useState, useEffect, useCallback, useRef } from "react";
import { collective, post } from "@lib/api";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "@context/auth-context";
import type { Post, Comment, Collective, Channel } from "@types";
import axios from "axios";

interface CollectivePost extends Post {
  channel: string;
}

const CollectiveHome = () => {
  const [collectiveData, setCollectiveData] = useState<Collective | null>(null);
  const [posts, setPosts] = useState<CollectivePost[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CollectivePost | null>(null);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<{ [postId: string]: Comment[] }>({});
  const [loadingComments, setLoadingComments] = useState<{ [postId: string]: boolean }>({});
  
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
  const { collectiveId } = useParams<{ collectiveId: string }>();
  const { user, isAdminOfACollective, getUserId } = useAuth();

  // Form states
  const [postForm, setPostForm] = useState({
    description: '',
    post_type: 'default',
    image_url: null as File | null,
    video_url: null as File | null,
    chapters: [{ chapter: '', content: '' }],
    channel_id: '' // Added channel_id field
  });

  const handleBecomeAdmin = async (collectiveId: string) => {
    try {
      await collective.put(`${collectiveId}/admin/join/`, {}, { withCredentials: true })
      toast.success('Successfully become an admin of this collective')
    } catch(err) {
      toast.error(err)
    }
  }

  // Fetch collective data and initial posts
  useEffect(() => {
    const fetchData = async () => {
      if (!collectiveId) return;

      try {
        setLoading(true);
        // Fetch collective data
        const collectiveResponse = await collective.get(`${collectiveId}/`);
        setCollectiveData(collectiveResponse.data);

        // Set first channel as selected by default
        if (collectiveResponse.data.channels.length > 0) {
          const firstChannel = collectiveResponse.data.channels[0];
          setSelectedChannel(firstChannel);
          setPostForm(prev => ({ ...prev, channel_id: firstChannel.channel_id }));
          await fetchPosts(firstChannel.channel_id, 1, false);
        }
      } catch (err) {
        setError("Failed to fetch data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [collectiveId]);

  // Fetch posts for a specific channel
  const fetchPosts = useCallback(async (
    channelId: string,
    page: number = 1,
    append: boolean = false
  ) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const response = await collective.get(`channel/${channelId}/posts/`, {
        params: { page, page_size: 10 }
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
  }, []);

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
          !isFetching &&
          selectedChannel
        ) {
          isFetching = true;
          fetchPosts(selectedChannel.channel_id, pagination.currentPage + 1, true)
            .finally(() => {
              isFetching = false;
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
  }, [pagination.hasNext, loadingMore, loading, fetchPosts, pagination.currentPage, selectedChannel]);

  // Fetch comments for a post
  const fetchCommentsForPost = useCallback(async (postId: string, page: number = 1, append: boolean = false) => {
    try {
      setLoadingComments(prev => ({ ...prev, [postId]: true }));
      
      const response = await post.get(`/comment/${postId}/`, {
        params: { page, page_size: 10 }
      });
      
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
  }, []);

  // Handle channel selection
  const handleChannelClick = async (channel: Channel) => {
    setSelectedChannel(channel);
    setPostForm(prev => ({ ...prev, channel_id: channel.channel_id }));
    await fetchPosts(channel.channel_id, 1, false);
    setExpandedPost(null); // Reset expanded post when changing channels
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

  // Post operations
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkAuth() || !selectedChannel) return;

    try {
      const formData = new FormData();
      formData.append('description', postForm.description);
      formData.append('post_type', postForm.post_type);
      formData.append('channel', selectedChannel.channel_id); // Add channel_id to form data
      
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
        chapters: [{ chapter: '', content: '' }],
        channel_id: selectedChannel.channel_id
      });
      
      // Refresh posts for the current channel
      await fetchPosts(selectedChannel.channel_id, 1, false);
    } catch (error) {
      handleApiError(error, `Failed to ${editing ? 'update' : 'create'} post`);
    }
  };

  const deletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?') || !checkAuth() || !selectedChannel) return;
    
    try {
      await post.delete(`/delete/${postId}/`, { data: { confirm: true } });
      toast.success('Post deleted successfully');
      
      // Refresh posts for the current channel
      await fetchPosts(selectedChannel.channel_id, 1, false);
    } catch (error) {
      handleApiError(error, 'Failed to delete post');
    }
  };

  // Setup edit post
  const setupEditPost = (postItem: CollectivePost) => {
    setSelectedPost(postItem);
    setPostForm({
      description: postItem.description,
      post_type: postItem.post_type,
      image_url: null,
      video_url: null,
      chapters: postItem.novel_post?.map(np => ({
        chapter: np.chapter.toString(),
        content: np.content
      })) || [{ chapter: '', content: '' }],
      channel_id: postItem.channel
    });
    setEditing(true);
    setShowPostForm(true);
  };

  // Form reset
  const resetForms = () => {
    setShowPostForm(false);
    setEditing(false);
    setSelectedPost(null);
    if (selectedChannel) {
      setPostForm({
        description: '',
        post_type: 'default',
        image_url: null,
        video_url: null,
        chapters: [{ chapter: '', content: '' }],
        channel_id: selectedChannel.channel_id
      });
    }
  };

  // Toggle comments visibility
  const toggleComments = async (postId: string) => {
    if (expandedPost !== postId) {
      await fetchCommentsForPost(postId, 1, false);
    }
    setExpandedPost(expandedPost === postId ? null : postId);
  };

  // Load more comments
  const loadMoreComments = async (postId: string) => {
    const pagination = commentPagination[postId];
    if (pagination && pagination.hasNext) {
      await fetchCommentsForPost(postId, pagination.currentPage + 1, true);
    }
  };

  // Get comments for a post
  const getCommentsForPost = (postId: string) => {
    return postComments[postId] || [];
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

  // Render chapter fields for novel posts
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

  // Render media field based on post type
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
        </div>
        
        {isLoading && comments.length === 0 ? (
          <div className="text-center py-4">
            <div className="loading loading-spinner loading-sm"></div>
            <span className="ml-2">Loading comments...</span>
          </div>
        ) : comments.length === 0 ? (
          <p className="text-gray-500 text-sm">No comments yet.</p>
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

  if (loading && !collectiveData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error max-w-2xl mx-auto mt-8">
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {collectiveData && (
        <>
          {/* Collective Header */}
          <div className="bg-base-200 p-6 rounded-lg mb-6">
            <h1 className="text-3xl font-bold mb-2">{collectiveData.title}</h1>
            <p className="text-lg mb-4">{collectiveData.description}</p>
            
            <div className='py-2'>
              {isAdminOfACollective(collectiveData.collective_id) ?
                <div className='hover:cursor-not-allowed'>
                  <button className="btn btn-primary w-full" disabled>Already admin</button>
                </div> :
                <button className="btn btn-primary" onClick={() => handleBecomeAdmin(collectiveData.collective_id)}>Become Admin</button>
              }
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {collectiveData.artist_types.map((type, index) => (
                <span key={index} className="badge badge-primary">
                  {type}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span>
                Created:{" "}
                {new Date(collectiveData.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Rules Section */}
          <div className="bg-base-100 p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-2xl font-semibold mb-4">Community Rules</h2>
            <ul className="list-disc pl-5">
              {collectiveData.rules.map((rule, index) => (
                <li key={index} className="mb-2">
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          {/* Channels Section */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-4">Channels</h2>
            <div className="flex flex-wrap gap-4">
              {collectiveData.channels.map((channel) => (
                <div
                  key={channel.channel_id}
                  className={`card shadow-md w-64 ${
                    selectedChannel?.channel_id === channel.channel_id
                      ? 'bg-primary text-primary-content'
                      : 'bg-base-100'
                  }`}
                >
                  <div className="card-body">
                    <h3 className="card-title">{channel.title}</h3>
                    <div className="card-actions justify-end">
                      <button 
                        className="btn btn-sm"
                        onClick={() => handleChannelClick(channel)}
                      >
                        {selectedChannel?.channel_id === channel.channel_id ? 'Viewing' : 'View'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

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

          {/* Posts Section */}
          {selectedChannel && (
            <div className="bg-base-100 p-6 rounded-lg shadow-md mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">
                  Posts in {selectedChannel.title}
                </h2>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setShowPostForm(true)}
                  disabled={!user}
                >
                  Create Post
                </button>
              </div>
              
              {!user && (
                <div className="alert alert-warning mb-4">
                  You must be logged in to create posts
                </div>
              )}
              
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
                              getCommentsForPost(postItem.post_id).length})
                            </>
                          )}
                        </button>
                      </div>

                      {/* Comments Section */}
                      {expandedPost === postItem.post_id && renderComments(postItem.post_id)}

                      {user && (
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
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {posts.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  No posts found in this channel. Be the first to create one!
                </div>
              )}
              
              {renderLoadingIndicator()}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CollectiveHome;