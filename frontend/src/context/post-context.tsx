import {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
} from "react";
import type {
  PostContextType,
  Pagination,
  Comment,
  Post,
  PostForm,
  FetchPost,
  CommentReplyForm,
  Critique,
  CritiqueForm,
  CritiqueReplyForm,
  CommentPagination
} from "@types";
import { post, collective } from "@lib/api";
import { toast } from "react-toastify";
import { handleApiError } from "@utils";
import { fetchPostsErrors, defaultErrors } from "@errors";

type fetchCommentsForPostType = (
  postId: string, // fetch comments of that postId
  page: number, // fetch comments on that page
  append: boolean // true appends new comments to existing. false reset the comments
) => Promise<void>;

export const PostContext = createContext<PostContextType | undefined>(
  undefined
);

export const PostProvider = ({ children }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  // const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({});
  const [loadingComments, setLoadingComments] = useState<{
    [postId: string]: boolean;
  }>({});
  const [commentPagination, setCommentPagination] = useState<{
    [postId: string]: CommentPagination;
  }>({});
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentForm, setCommentForm] = useState({ post_id: "", text: "" });
  const [editing, setEditing] = useState(false);

  // Post states
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalCount: 0,
    hasNext: false,
    hasPrevious: false,
  });
  const [postForm, setPostForm] = useState<PostForm>({
    description: "",
    post_type: "default",
    image_url: null as File | null,
    video_url: null as File | null,
    chapters: [{ chapter: "", content: "" }],
  });
  const [loadingHearts, setLoadingHearts] = useState<{
    [postId: string]: boolean;
  }>({});
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [activePost, setActivePost] = useState<Post | null>(null);

  // Reply states
  const [replyForms, setReplyForms] = useState<{
    [commentId: string]: CommentReplyForm;
  }>({});
  const [loadingReplies, setLoadingReplies] = useState<{
    [commentId: string]: boolean;
  }>({});

  // Critique states
  const [critiques, setCritiques] = useState<{ [postId: string]: Critique[] }>({});
  const [loadingCritiques, setLoadingCritiques] = useState<{ [postId: string]: boolean }>({});
  const [critiquePagination, setCritiquePagination] = useState<{ [postId: string]: Pagination }>({});
  const [showCritiqueForm, setShowCritiqueForm] = useState(false);
  const [critiqueForm, setCritiqueForm] = useState<CritiqueForm>({
    text: "",
    impression: "positive", // default impression
    post_id: ""
  });
  const [editingCritique, setEditingCritique] = useState(false);
  const [selectedCritique, setSelectedCritique] = useState<Critique | null>(null);
  
  // Critique reply states
  const [critiqueReplyForms, setCritiqueReplyForms] = useState<{ [critiqueId: string]: CritiqueReplyForm }>({});
  const [loadingCritiqueReplies, setLoadingCritiqueReplies] = useState<{ [critiqueId: string]: boolean }>({});


  /* CRITIQUE FUNCTIONALITY */
  const fetchCritiquesForPost = async (postId: string, page: number, append: boolean) => {
    try {
      setLoadingCritiques(prev => ({ ...prev, [postId]: true }));
      
      const response = await post.get(`/${postId}/critiques/`, {
        params: { page }
      });
      
      const critiquesData = response.data.results || [];
      const paginationData = {
        currentPage: page,
        hasNext: response.data.next !== null,
        hasPrevious: response.data.previous !== null,
        totalCount: response.data.count || critiquesData.length,
      };

      if (append) {
        setCritiques(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), ...critiquesData]
        }));
      } else {
        setCritiques(prev => ({ ...prev, [postId]: critiquesData }));
      }

      setCritiquePagination(prev => ({ ...prev, [postId]: paginationData }));
    } catch (error) {
      console.error("Critique fetch error: ", error);
      toast.error(handleApiError(error, defaultErrors));
    } finally {
      setLoadingCritiques(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleCritiqueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCritique) {
        await post.put(`/critique/${selectedCritique?.critique_id}/update/`, {
          text: critiqueForm.text,
          impression: critiqueForm.impression
        });
      } else {
        await post.post("/critique/create/", critiqueForm);
      }

      toast.success(`Critique ${editingCritique ? "updated" : "created"} successfully`);
      setShowCritiqueForm(false);
      setEditingCritique(false);
      setSelectedCritique(null);
      setCritiqueForm({ text: "", impression: "positive", post_id: "" });

      // Refresh critiques for the specific post
      if (critiqueForm.post_id) {
        await fetchCritiquesForPost(critiqueForm.post_id, 1, false);
      }
    } catch (error) {
      console.error("Critique submission error: ", error);
      toast.error(handleApiError(error, defaultErrors));
    }
  };

  const deleteCritique = async (critiqueId: string, postId: string) => {
    if (!window.confirm("Are you sure you want to delete this critique?")) return;

    try {
      await post.delete(`/critique/${critiqueId}/delete/`, {
        data: { confirm: true }
      });
      toast.success("Critique deleted successfully");

      // Refresh critiques for the specific post
      const currentPage = critiquePagination[postId]?.currentPage || 1;
      await fetchCritiquesForPost(postId, currentPage, false);
    } catch (error) {
      console.error("Critique deletion error: ", error);
      toast.error(handleApiError(error, defaultErrors));
    }
  };

  /* CRITIQUE REPLY FUNCTIONALITY */
  const handleCritiqueReplySubmit = async (e: React.FormEvent, critiqueId: string) => {
    e.preventDefault();

    const replyForm = critiqueReplyForms[critiqueId];
    if (!replyForm?.text.trim()) return;

    try {
      await post.post("/critique/reply/create/", replyForm);
      toast.success("Reply created successfully");

      // Clear reply form
      setCritiqueReplyForms(prev => ({
        ...prev,
        [critiqueId]: { ...prev[critiqueId], text: "" }
      }));

      // Refresh replies for the critique
      await fetchRepliesForCritique(critiqueId);
    } catch (error) {
      console.error("Critique reply submission error: ", error);
      toast.error(handleApiError(error, defaultErrors));
    }
  };

  const fetchRepliesForCritique = async (critiqueId: string) => {
    try {
      setLoadingCritiqueReplies(prev => ({ ...prev, [critiqueId]: true }));

      const response = await post.get(`/critique/${critiqueId}/replies/`);
      const repliesData = response.data.results || [];
      const reply_count = response.data.reply_count || 0

      // Update critiques with replies
      setCritiques(prev => {
        const updatedCritiques = { ...prev };
        Object.keys(updatedCritiques).forEach(postId => {
          updatedCritiques[postId] = updatedCritiques[postId].map(critique => {
            if (critique.critique_id === critiqueId) {
              return { ...critique, reply_count: reply_count, replies: repliesData };
            }
            return critique;
          });
        });
        return updatedCritiques;
      });
    } catch (error) {
      console.error("Fetch critique replies error: ", error);
      toast.error(handleApiError(error, defaultErrors));
    } finally {
      setLoadingCritiqueReplies(prev => ({ ...prev, [critiqueId]: false }));
    }
  };

  const setupCritiqueReplyForm = (critiqueId: string) => {
    setCritiqueReplyForms(prev => ({
      ...prev,
      [critiqueId]: {
        text: "",
        critique_id: critiqueId
      }
    }));
  };

  const handleCritiqueReplyFormChange = (critiqueId: string, text: string) => {
    setCritiqueReplyForms(prev => ({
      ...prev,
      [critiqueId]: {
        ...prev[critiqueId],
        text
      }
    }));
  };

  const toggleCritiqueReplies = async (critiqueId: string) => {
    setCritiques(prev => {
      const updatedCritiques = { ...prev };
      Object.keys(updatedCritiques).forEach(postId => {
        updatedCritiques[postId] = updatedCritiques[postId].map(critique => {
          if (critique.critique_id === critiqueId) {
            const newShowReplies = !critique.show_replies;
            // Fetch replies if showing for the first time and no replies loaded
            if (newShowReplies && (!critique.replies || critique.replies.length === 0)) {
              fetchRepliesForCritique(critiqueId);
            }
            return { ...critique, show_replies: newShowReplies };
          }
          return critique;
        });
      });
      return updatedCritiques;
    });
  };

  const toggleCritiqueReplyForm = (critiqueId: string) => {
    setCritiques(prev => {
      const updatedCritiques = { ...prev };
      Object.keys(updatedCritiques).forEach(postId => {
        updatedCritiques[postId] = updatedCritiques[postId].map(critique => {
          if (critique.critique_id === critiqueId) {
            return { ...critique, is_replying: !critique.is_replying };
          }
          return critique;
        });
      });
      return updatedCritiques;
    });
  }


  /* REPLY FUNCTIONALITY */
  const handleReplySubmit = async (
    e: React.FormEvent,
    parentCommentId: string
  ) => {
    e.preventDefault();

    const replyForm = replyForms[parentCommentId];
    if (!replyForm?.text.trim()) return;

    try {
      await post.post("/comment/reply/create/", replyForm);
      toast.success("Reply created successfully");

      // Clear reply form
      setReplyForms((prev) => ({
        ...prev,
        [parentCommentId]: { ...prev[parentCommentId], text: "" },
      }));

      // Refresh replies for the parent comment
      await fetchRepliesForComment(parentCommentId);
      
    } catch (error) {
      console.error("Reply submission error: ", error);
      toast.error(handleApiError(error, defaultErrors));
    }
  };

  const fetchRepliesForComment = async (commentId: string) => {
    try {
      if(!activePost) return

      setLoadingReplies((prev) => ({ ...prev, [commentId]: true }));

      const response = await post.get(`/comment/${commentId}/replies/`);
      const repliesData = response.data.results || [];

      await fetchCommentsForPost(activePost.post_id, 1, false)

      // Update comments with replies
      setComments((prev) => {
        const updatedComments = { ...prev };
        Object.keys(updatedComments).forEach((postId) => {
          updatedComments[postId] = updatedComments[postId].map((comment) => {
            if (comment.comment_id === commentId) {
              return { ...comment, replies: repliesData };
            }
            return comment;
          });
        });
        console.log('commnets replt ', comments)

        return updatedComments;
      });
    } catch (error) {
      console.error("Fetch replies error: ", error);
      toast.error(handleApiError(error, defaultErrors));
    } finally {
      setLoadingReplies((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  const setupReplyForm = (commentId: string, postId: string) => {
    setReplyForms((prev) => ({
      ...prev,
      [commentId]: {
        text: "",
        replies_to: commentId,
        post_id: postId,
      },
    }));
  };

  const handleReplyFormChange = (commentId: string, text: string) => {
    setReplyForms((prev) => ({
      ...prev,
      [commentId]: {
        ...prev[commentId],
        text,
      },
    }));
  };

  const toggleReplies = async (commentId: string) => {
    setComments((prev) => {
      const updatedComments = { ...prev };
      Object.keys(updatedComments).forEach((postId) => {
        updatedComments[postId] = updatedComments[postId].map((comment) => {
          if (comment.comment_id === commentId) {
            const newShowReplies = !comment.show_replies;
            // Fetch replies if showing for the first time and no replies loaded
            if (
              newShowReplies &&
              (!comment.replies || comment.replies.length === 0)
            ) {
              fetchRepliesForComment(commentId);
            }
            return { ...comment, show_replies: newShowReplies };
          }
          return comment;
        });
      });
      return updatedComments;
    });
  };

  const toggleReplyForm = (commentId: string) => {
    setComments((prev) => {
      const updatedComments = { ...prev };
      Object.keys(updatedComments).forEach((postId) => {
        updatedComments[postId] = updatedComments[postId].map((comment) => {
          if (comment.comment_id === commentId) {
            return { ...comment, is_replying: !comment.is_replying };
          }
          return comment;
        });
      });
      return updatedComments;
    });
  };

  /* HEARTING FUNCTIONALITY */
  const heartPost = useCallback(async (postId: string) => {
    try {
      setLoadingHearts((prev) => ({ ...prev, [postId]: true }));

      await post.post("heart/react/", { post_id: postId });

      // Update the post in posts array
      setPosts((prev) =>
        prev.map((post) =>
          post.post_id === postId
            ? {
                ...post,
                hearts_count: (post.hearts_count || 0) + 1,
                is_hearted_by_user: true,
              }
            : post
        )
      );

      // ALSO update activePost if it's the same post
      setActivePost((prev) =>
        prev?.post_id === postId
          ? {
              ...prev,
              hearts_count: (prev.hearts_count || 0) + 1,
              is_hearted_by_user: true,
            }
          : prev
      );

      toast.success("Post hearted!");
    } catch (error) {
      console.error("Heart post error: ", error);
      toast.error(handleApiError(error, defaultErrors));
    } finally {
      setLoadingHearts((prev) => ({ ...prev, [postId]: false }));
    }
  }, []);

  const unheartPost = useCallback(async (postId: string) => {
    try {
      setLoadingHearts((prev) => ({ ...prev, [postId]: true }));

      await post.delete(`${postId}/unheart/`);

      // Update the post in posts array
      setPosts((prev) =>
        prev.map((post) =>
          post.post_id === postId
            ? {
                ...post,
                hearts_count: Math.max(0, (post.hearts_count || 1) - 1),
                is_hearted_by_user: false,
              }
            : post
        )
      );

      // ALSO update activePost if it's the same post
      setActivePost((prev) =>
        prev?.post_id === postId
          ? {
              ...prev,
              hearts_count: Math.max(0, (prev.hearts_count || 1) - 1),
              is_hearted_by_user: false,
            }
          : prev
      );

      toast.success("Post unhearted!");
    } catch (error) {
      console.error("Unheart post error: ", error);
      toast.error(handleApiError(error, defaultErrors));
    } finally {
      setLoadingHearts((prev) => ({ ...prev, [postId]: false }));
    }
  }, []);

  /* COMMENTS */
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editing) {
        await post.put(`/comment/update/${selectedComment?.comment_id}/`, {
          text: commentForm.text,
        });
      } else {
        await post.post("/comment/create/", commentForm);
      }

      toast.success(`Comment ${editing ? "updated" : "created"} successfully`);
      setShowCommentForm(false);
      setEditing(false);
      setSelectedComment(null);
      
      // Refresh comments for the specific post (first page)
      if (commentForm.post_id) {
        await fetchCommentsForPost(commentForm.post_id, 1, false);
      }

      setCommentForm({ text: "", post_id: "" });
    } catch (error) {
      console.error("Comment submission error: ", error);
      toast.error(handleApiError(error, defaultErrors));
    }
  };

  const deleteComment = async (commentId: string, postId: string) => {
    if (!window.confirm("Are you sure you want to delete this comment?"))
      return;

    try {
      await post.delete(`/comment/delete/${commentId}/`, {
        data: { confirm: true },
      });
      toast.success("Comment deleted successfully");

      // Refresh comments for the specific post (current page)
      const currentPage = commentPagination[postId]?.currentPage || 1;
      await fetchCommentsForPost(postId, currentPage, false);
    } catch (error) {
      console.error("Comment deletion error: ", error);
      toast.error(handleApiError(error, defaultErrors));
    }
  };

  const fetchCommentsForPost: fetchCommentsForPostType = async (
    postId,
    page = 1,
    append
  ) => {
    try {
      setLoadingComments((prev) => ({ ...prev, [postId]: true })); // Set comments of matching post id to load

      const response = await post.get(`/comment/${postId}/`, {
        params: { page },
      });
      const commentsData = response.data.results || [];
      const paginationData = {
        currentPage: page,
        hasNext: response.data.next !== null,
        hasPrevious: response.data.previous !== null,
        totalCount: response.data.count || 0,
        commentCount: response.data.total_comments || 0
      };

      if (append) {
        setComments((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), ...commentsData],
        }));
      } else {
        setComments((prev) => ({ ...prev, [postId]: commentsData }));
      }
      setCommentPagination((prev) => ({ ...prev, [postId]: paginationData }));
    } catch (error) {
      console.error("Comment fetch error: ", error);
      toast.error(handleApiError(error, defaultErrors));
    } finally {
      setLoadingComments((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // Load more comments (initially paginated)
  const loadMoreComments = async (postId: string) => {
    const pagination = commentPagination[postId];
    if (pagination && pagination.hasNext) {
      await fetchCommentsForPost(postId, pagination.currentPage + 1, true);
    }
  };

  /* POSTS */
  // Fetch data functions
  // Optional parameters:
  // channel_id -> if post-context is used within collective
  // user_id -> if post-context is used within profile timeline
  const fetchPosts: FetchPost = useCallback(
    async (page = 1, append = false, channel_id?, user_id?) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }
        let url = "/";
        let response;

        if (channel_id) {
          url = `channel/${channel_id}/posts/`;
          response = await collective.get(url, {
            params: { page, page_size: 10 },
          });
        } else if (user_id) {
          url = `me/${user_id}/`;
          response = await post.get(url, {
            params: { page, page_size: 10 },
          });
        } else {
          response = await post.get(url, {
            params: { page, page_size: 10 },
          });
        }

        // Ensure posts have heart data
        const postsWithHearts = (response.data.results || []).map(
          (post: Post) => ({
            ...post,
            hearts_count: post.hearts_count || 0,
            is_hearted_by_user: post.is_hearted_by_user || false,
          })
        );

        if (append) {
          setPosts((prev) => [...prev, ...postsWithHearts]);
        } else {
          setPosts(postsWithHearts);
        }

        setPagination((prev) => ({
          ...prev,
          currentPage: page,
          totalCount: response.data.count,
          hasNext: response.data.next !== null,
          hasPrevious: response.data.previous !== null,
        }));
      } catch (error) {
        const message = handleApiError(error, fetchPostsErrors);
        toast.error(message);
        console.error("Posts fetch error", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Post operations
  const handlePostSubmit = async (
    e: React.FormEvent,
    channel_id?: string,
    user_id?: number
  ) => {
    e.preventDefault();
    console.log(channel_id, user_id);

    try {
      const formData = new FormData();
      formData.append("description", postForm.description);
      formData.append("post_type", postForm.post_type);
      if (channel_id) formData.append("channel", channel_id);

      if (postForm.image_url) formData.append("image_url", postForm.image_url);
      if (postForm.video_url) formData.append("video_url", postForm.video_url);

      if (postForm.post_type === "novel") {
        postForm.chapters.forEach((chapter, index) => {
          formData.append(`chapters[${index}].chapter`, chapter.chapter);
          formData.append(`chapters[${index}].content`, chapter.content);
        });
      }

      const url = editing ? `/update/${selectedPost?.post_id}/` : "/create/";
      const method = editing ? "put" : "post";

      await post[method](url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(`Post ${editing ? "updated" : "created"} successfully`);
      setShowPostForm(false);
      setEditing(false);
      setSelectedPost(null);
      setPostForm({
        description: "",
        post_type: "default",
        image_url: null,
        video_url: null,
        chapters: [{ chapter: "", content: "" }],
        channel_id: channel_id,
      });
      refreshPosts(channel_id, user_id);
    } catch (error) {
      console.error("Post submission error: ", error);
      toast.error(handleApiError(error, defaultErrors));
    }
  };

  const deletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      await post.delete(`/delete/${postId}/`, { data: { confirm: true } });
      toast.success("Post deleted successfully");

      // Refresh posts (could optimize by filtering locally)
      refreshPosts();
    } catch (error) {
      console.error("Post deletion error: ", error);
      toast.error(handleApiError(error, defaultErrors));
    }
  };

  // Handle form changes
  const handlePostFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setPostForm((prev) => ({ ...prev, [name]: value }));
  };

  const refreshPosts = (channel_id?: string, user_id?: number) => {
    if (channel_id) fetchPosts(1, false, channel_id);
    else if (user_id) fetchPosts(1, false, undefined, user_id);
    else fetchPosts(1, false);
  };

  // Form reset
  const resetForms = (channel_id?: string) => {
    setShowPostForm(false);
    setShowCommentForm(false);
    setEditing(false);
    setSelectedPost(null);
    setSelectedComment(null);
    setPostForm({
      description: "",
      post_type: "default",
      image_url: null,
      video_url: null,
      chapters: [{ chapter: "", content: "" }],
      ...(channel_id && { channel_id: channel_id }), // Assign channel_id if exists
    });
    setCommentForm({ text: "", post_id: "" });
  };

  useEffect(() => {
    if (activePost) {
      fetchCommentsForPost(activePost.post_id, 1, false);
    } else {
      setActivePost(null)
    }
  }, [activePost]);

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
    dropdownOpen,
    setDropdownOpen,
    activePost,
    setActivePost,

    resetForms,

    // Hearting functionality
    heartPost,
    unheartPost,
    loadingHearts,

    // Reply functionality
    replyForms,
    loadingReplies,
    handleReplySubmit,
    fetchRepliesForComment,
    setupReplyForm,
    handleReplyFormChange,
    toggleReplies,
    toggleReplyForm,

    // Critique functionality
    critiques,
    loadingCritiques,
    critiquePagination,
    showCritiqueForm,
    setShowCritiqueForm,
    critiqueForm,
    setCritiqueForm,
    editingCritique,
    setEditingCritique,
    selectedCritique,
    setSelectedCritique,
    fetchCritiquesForPost,
    handleCritiqueSubmit,
    deleteCritique,
    
    // Critique reply functionality
    critiqueReplyForms,
    loadingCritiqueReplies,
    handleCritiqueReplySubmit,
    fetchRepliesForCritique,
    setupCritiqueReplyForm,
    handleCritiqueReplyFormChange,
    toggleCritiqueReplies,
    toggleCritiqueReplyForm,
  };

  return (
    <PostContext.Provider value={contextValue}>{children}</PostContext.Provider>
  );
};

export const usePostContext = (): PostContextType => {
  const context = useContext(PostContext);
  if (context === undefined) {
    throw new Error("usePostContext must be within a PostProvider");
  }

  return context;
};
