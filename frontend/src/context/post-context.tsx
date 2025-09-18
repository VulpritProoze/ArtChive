import { createContext, useState, useContext, useCallback } from 'react'
import type { PostContextType, Pagination, Comment, Post, PostForm } from '@types'
import { post } from '@lib/api'
import { toast } from 'react-toastify'

type fetchCommentsForPostType = (
    postId: string, // fetch comments of that postId
    page: number, // fetch comments on that page
    append: boolean // true appends new comments to existing. false reset the comments
) => Promise<void>

export const PostContext = createContext<PostContextType | undefined>(undefined)

export const PostProvider = ({ children }) => {
    const [comments, setComments] = useState<Comment[]>([])
    const [loadingComments, setLoadingComments] = useState<{ [postId: string]: boolean }>({})
    const [commentPagination, setCommentPagination] = useState<{ [postId: string]: Pagination }>({});
    const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
    const [showCommentForm, setShowCommentForm] = useState(false);
    const [commentForm, setCommentForm] = useState({ post_id: '', text: '' });
    const [editing, setEditing] = useState(false);

    // Post states
    const [posts, setPosts] = useState<Post[]>([]);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [showPostForm, setShowPostForm] = useState(false);
    const [expandedPost, setExpandedPost] = useState<string | null>(null)
    const [pagination, setPagination] = useState<Pagination>({ currentPage: 1, totalCount: 0, hasNext: false, hasPrevious: false })
    const [postForm, setPostForm] = useState<PostForm>({
        description: '',
        post_type: 'default',
        image_url: null as File | null,
        video_url: null as File | null,
        chapters: [{ chapter: '', content: '' }],
      });

    /* COMMENTS */
    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

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
            toast.error('Error submitting comment')
        }
        };
    
        const deleteComment = async (commentId: string, postId: string) => {
        if (!window.confirm('Are you sure you want to delete this comment?')) return;
        
        try {
            await post.delete(`/comment/delete/${commentId}/`, { data: { confirm: true } });
            toast.success('Comment deleted successfully');
            
            // Refresh comments for the specific post (current page)
            const currentPage = commentPagination[postId]?.currentPage || 1;
            await fetchCommentsForPost(postId, currentPage, false);
        } catch (error) {
            toast.error('Error deleting comment')
        }
        };

    const fetchCommentsForPost: fetchCommentsForPostType = async (postId, page = 1, append) => {
        try {
            setLoadingComments(prev => ({ ...prev, [postId]: true }))   // Set comments of matching post id to load

            const response = await post.get(`/comment/${postId}/`, { params: { page } })
            const commentsData = response.data.results || []
            const paginationData = {
                currentPage: page,
                hasNext: response.data.next !== null,
                hasPrevious: response.data.previous !== null,
                totalCount: response.data.count || commentsData.length
            }

            if (append) {
                setComments(prev => ({ ...prev, 
                    [postId]: [...(prev[postId] || []), ...commentsData] }))
            } else {
                setComments(prev => ({ ...prev,
                    [postId]: commentsData
                }))
            }

            setCommentPagination(prev => ({ ...prev,
                [postId]: paginationData
            }))
        } catch (error) {
            toast.error(`Failed to fetch comments for ${postId}`)
            console.error(error)
        } finally {
            setLoadingComments(prev => ({ ...prev, [postId]: false }))
        }
    }

    // Load more comments (initially paginated)
    const loadMoreComments = async (postId: string) => {
        const pagination = commentPagination[postId];
        if (pagination && pagination.hasNext) {
        await fetchCommentsForPost(postId, pagination.currentPage + 1, true);
        }
    };

    /* POSTS */
    // Fetch data functions
    const fetchPosts = useCallback(async (
    page: number = 1,
    append: boolean = false
    ) => {
        try {
            if (append) {
                setLoadingMore(true)
            } else {
                setLoading(true)
            }

            const response = await post.get('/', {
            params: { page, page_size: 10 }
            });

            if (append) {
                setPosts(prev => [...prev, ...response.data.results]);
            } else {
                setPosts(response.data.results || [])
            }

            setPagination(prev => ({
            ...prev,
            currentPage: page,
            totalCount: response.data.count,
            hasNext: response.data.next !== null,
            hasPrevious: response.data.previous !== null
            }))
        } catch (error) {
            toast.error('Failed to fetch posts');
            console.error(error);
        } finally {
            setLoading(false);
            setLoadingMore(false)
        }
    }, [])

    // Post operations
    const handlePostSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

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
        
        refreshPosts()
        } catch (error) {
        toast.error(`Failed to ${editing ? 'update' : 'create'} post`);
        }
    };

    const deletePost = async (postId: string) => {
        if (!window.confirm('Are you sure you want to delete this post?')) return;
        
        try {
        await post.delete(`/delete/${postId}/`, { data: { confirm: true } });
        toast.success('Post deleted successfully');
        
        // Refresh posts (could optimize by filtering locally)
        refreshPosts();
        } catch (error) {
        toast.error('Failed to delete post');
        }
    };

    // Handle form changes
    const handlePostFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setPostForm(prev => ({ ...prev, [name]: value }));
    };

    const refreshPosts = () => {
        fetchPosts(1, false)
    }

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

    const contextValue: PostContextType = {
        comments,
        setComments,
        commentForm,
        setCommentForm,
        editing,
        setEditing,
        commentPagination,
        loadingComments,
        fetchCommentsForPost,
        loadMoreComments,
        handleCommentSubmit,
        deleteComment,
        setSelectedComment,
        showCommentForm,
        setShowCommentForm,

        // Posts
        posts,
        pagination,
        expandedPost,
        setExpandedPost,
        selectedPost,
        setSelectedPost,
        postForm,
        setPostForm,
        showPostForm,
        setShowPostForm,
        loading,
        setLoading,
        loadingMore,
        setLoadingMore,
        fetchPosts,
        handlePostSubmit,
        deletePost,
        handlePostFormChange,

        resetForms,
    }

    return (
        <PostContext.Provider value={contextValue}>
            {children}
        </PostContext.Provider>
    )
}

export const usePostContext = (): PostContextType => {
    const context = useContext(PostContext)
    if (context === undefined) {
        throw new Error('usePostContext must be within a PostProvider')
    }

    return context
}