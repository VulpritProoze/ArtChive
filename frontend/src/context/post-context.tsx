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
import { toast } from "@utils/toast.util";
import { handleApiError, formatErrorForToast } from "@utils";
import { fetchPostsErrors, defaultErrors, brushDripTransactionErrors } from "@errors";

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
  const [submittingPost, setSubmittingPost] = useState(false);
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
  const [submittingCritique, setSubmittingCritique] = useState(false);
  
  // Critique reply states
  const [critiqueReplyForms, setCritiqueReplyForms] = useState<{ [critiqueId: string]: CritiqueReplyForm }>({});
  const [loadingCritiqueReplies, setLoadingCritiqueReplies] = useState<{ [critiqueId: string]: boolean }>({});
  const [submittingCritiqueReply, setSubmittingCritiqueReply] = useState<{ [critiqueId: string]: boolean }>({});

  // Praise states
  const [loadingPraise, setLoadingPraise] = useState<{ [postId: string]: boolean }>({});
  const [praiseStatus, setPraiseStatus] = useState<{ [postId: string]: { count: number; isPraised: boolean } }>({});
  const [showPraiseListModal, setShowPraiseListModal] = useState(false);
  const [selectedPostForPraiseList, setSelectedPostForPraiseList] = useState<string | null>(null);

  // Trophy states
  const [loadingTrophy, setLoadingTrophy] = useState<{ [postId: string]: boolean }>({});
  const [trophyStatus, setTrophyStatus] = useState<{ [postId: string]: { counts: any; userAwarded: string[] } }>({});
  const [showTrophyModal, setShowTrophyModal] = useState(false);
  const [selectedPostForTrophy, setSelectedPostForTrophy] = useState<string | null>(null);
  const [showTrophyListModal, setShowTrophyListModal] = useState(false);
  const [selectedPostForTrophyList, setSelectedPostForTrophyList] = useState<string | null>(null);


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
      toast.error('Failed to load critiques', formatErrorForToast(handleApiError(error, defaultErrors)));
    } finally {
      setLoadingCritiques(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleCritiqueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submittingCritique) {
      return;
    }
    setSubmittingCritique(true);

    try {
      if (editingCritique) {
        // Only send text when editing (impression cannot be changed)
        await post.put(`/critique/${selectedCritique?.critique_id}/update/`, {
          text: critiqueForm.text
        });
      } else {
        await post.post("/critique/create/", critiqueForm);
      }

      toast.success(`Critique ${editingCritique ? "updated" : "created"}`, 'Your critique has been saved successfully');
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
      const message = formatErrorForToast(handleApiError(error, defaultErrors, true, true));
      toast.error('Failed to save critique', message);
    }
    finally {
      setSubmittingCritique(false);
    }
  };

  const deleteCritique = async (critiqueId: string, postId: string) => {
    if (!window.confirm("Are you sure you want to delete this critique?")) return;

    try {
      await post.delete(`/critique/${critiqueId}/delete/`, {
        data: { confirm: true }
      });
      toast.success("Critique deleted", "The critique has been removed successfully");

      // Refresh critiques for the specific post
      const currentPage = critiquePagination[postId]?.currentPage || 1;
      await fetchCritiquesForPost(postId, currentPage, false);
    } catch (error) {
      console.error("Critique deletion error: ", error);
      toast.error('Failed to delete critique', formatErrorForToast(handleApiError(error, defaultErrors)));
    }
  };

  /* CRITIQUE REPLY FUNCTIONALITY */
  const handleCritiqueReplySubmit = async (e: React.FormEvent, critiqueId: string) => {
    e.preventDefault();

    const replyForm = critiqueReplyForms[critiqueId];
    if (!replyForm?.text.trim()) return;

    try {
      setSubmittingCritiqueReply(prev => ({ ...prev, [critiqueId]: true }));
      await post.post("/critique/reply/create/", replyForm);
      toast.success("Reply posted", "Your reply has been added successfully");

      // Clear reply form
      setCritiqueReplyForms(prev => ({
        ...prev,
        [critiqueId]: { ...prev[critiqueId], text: "" }
      }));

      // Refresh replies for the critique
      await fetchRepliesForCritique(critiqueId);
    } catch (error) {
      console.error("Critique reply submission error: ", error);
      toast.error('Operation failed', formatErrorForToast(handleApiError(error, defaultErrors)));
    } finally {
      setSubmittingCritiqueReply(prev => ({ ...prev, [critiqueId]: false }));
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
      toast.error('Operation failed', formatErrorForToast(handleApiError(error, defaultErrors)));
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

  /* PRAISE FUNCTIONALITY */
  const praisePost = useCallback(async (postId: string) => {
    // Show confirmation dialog
    if (!window.confirm("Are you sure you want to praise this post? This will cost 1 Brush Drip.")) {
      return;
    }

    try {
      setLoadingPraise((prev) => ({ ...prev, [postId]: true }));

      await post.post("/praise/create/", { post_id: postId });

      // Refresh praise status
      await fetchPraiseStatus(postId);

      toast.success("Post praised!", "You've praised this post. 1 Brush Drip deducted");
    } catch (error) {
      console.error("Praise post error: ", error);
      toast.error('Failed to praise post', formatErrorForToast(handleApiError(error, brushDripTransactionErrors, true)));
    } finally {
      setLoadingPraise((prev) => ({ ...prev, [postId]: false }));
    }
  }, []);

  const fetchPraiseStatus = async (postId: string) => {
    try {
      const response = await post.get(`/${postId}/praises/count/`);
      setPraiseStatus((prev) => ({
        ...prev,
        [postId]: {
          count: response.data.praise_count,
          isPraised: response.data.is_praised_by_user,
        },
      }));
    } catch (error) {
      console.error("Fetch praise status error: ", error);
    }
  };

  /* TROPHY FUNCTIONALITY */
  const awardTrophy = useCallback(async (postId: string, trophyType: string) => {
    try {
      setLoadingTrophy((prev) => ({ ...prev, [postId]: true }));

      await post.post("/trophy/create/", {
        post_id: postId,
        trophy_type: trophyType,
      });

      // Refresh trophy status
      await fetchTrophyStatus(postId);

      toast.success("Trophy awarded!", "Your trophy has been awarded to this post");
      setShowTrophyModal(false);
      setSelectedPostForTrophy(null);
    } catch (error) {
      console.error("Award trophy error: ", error);
      const message = formatErrorForToast(handleApiError(error, brushDripTransactionErrors, true, true));
      toast.error('Failed to award trophy', message);
    } finally {
      setLoadingTrophy((prev) => ({ ...prev, [postId]: false }));
    }
  }, []);

  const fetchTrophyStatus = async (postId: string) => {
    try {
      const response = await post.get(`/${postId}/trophies/count/`);
      setTrophyStatus((prev) => ({
        ...prev,
        [postId]: {
          counts: response.data.trophy_counts,
          userAwarded: response.data.user_awarded_trophies,
        },
      }));
    } catch (error) {
      console.error("Fetch trophy status error: ", error);
    }
  };

  const openTrophyModal = (postId: string) => {
    setSelectedPostForTrophy(postId);
    setShowTrophyModal(true);
  };

  const closeTrophyModal = () => {
    setShowTrophyModal(false);
    setSelectedPostForTrophy(null);
  };

  const openPraiseListModal = (postId: string) => {
    setSelectedPostForPraiseList(postId);
    setShowPraiseListModal(true);
  };

  const closePraiseListModal = () => {
    setShowPraiseListModal(false);
    setSelectedPostForPraiseList(null);
  };

  const openTrophyListModal = (postId: string) => {
    setSelectedPostForTrophyList(postId);
    setShowTrophyListModal(true);
  };

  const closeTrophyListModal = () => {
    setShowTrophyListModal(false);
    setSelectedPostForTrophyList(null);
  };


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
      toast.success("Reply posted", "Your reply has been added successfully");

      // Hide the reply form
      toggleReplyForm(parentCommentId);

      // Clear reply form
      setReplyForms((prev) => ({
        ...prev,
        [parentCommentId]: { ...prev[parentCommentId], text: "" },
      }));

      // Refresh the entire comments list to get the new reply
      const postId = replyForm.post_id;
      if (postId) {
        await fetchCommentsForPost(postId, 1, false);
        
        // Also ensure replies are shown for this comment
        setComments((prev) => {
          const updatedComments = { ...prev };
          Object.keys(updatedComments).forEach((pid) => {
            updatedComments[pid] = updatedComments[pid].map((comment) => {
              if (comment.comment_id === parentCommentId) {
                return { ...comment, show_replies: true };
              }
              return comment;
            });
          });
          return updatedComments;
        });
      }
      
    } catch (error) {
      console.error("Reply submission error: ", error);
      toast.error('Operation failed', formatErrorForToast(handleApiError(error, defaultErrors)));
    }
  };

  const fetchRepliesForComment = async (commentId: string) => {
    try {
      setLoadingReplies((prev) => ({ ...prev, [commentId]: true }));

      const response = await post.get(`/comment/${commentId}/replies/`);
      const repliesData = response.data.results || [];

      // Update comments with replies - initialize is_replying for each reply
      setComments((prev) => {
        const updatedComments = { ...prev };
        Object.keys(updatedComments).forEach((postId) => {
          updatedComments[postId] = updatedComments[postId].map((comment) => {
            if (comment.comment_id === commentId) {
              return { 
                ...comment, 
                replies: repliesData.map((reply: Comment) => ({
                  ...reply,
                  is_replying: false
                }))
              };
            }
            return comment;
          });
        });

        return updatedComments;
      });
    } catch (error) {
      console.error("Fetch replies error: ", error);
      toast.error('Operation failed', formatErrorForToast(handleApiError(error, defaultErrors)));
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

      toast.success("Post hearted!", "You've added this post to your favorites");
    } catch (error) {
      console.error("Heart post error: ", error);
      toast.error('Operation failed', formatErrorForToast(handleApiError(error, defaultErrors)));
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

      toast.success("Post unhearted", "Removed from your favorites");
    } catch (error) {
      console.error("Unheart post error: ", error);
      toast.error('Operation failed', formatErrorForToast(handleApiError(error, defaultErrors)));
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

      toast.success(`Comment ${editing ? "updated" : "created"}`, 'Your comment has been saved successfully');
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
      toast.error('Operation failed', formatErrorForToast(handleApiError(error, defaultErrors)));
    }
  };

  const deleteComment = async (commentId: string, postId: string) => {
    if (!window.confirm("Are you sure you want to delete this comment?"))
      return;

    try {
      await post.delete(`/comment/delete/${commentId}/`, {
        data: { confirm: true },
      });
      toast.success("Comment deleted", "The comment has been removed");

      // Refresh comments for the specific post (current page)
      const currentPage = commentPagination[postId]?.currentPage || 1;
      await fetchCommentsForPost(postId, currentPage, false);
    } catch (error) {
      console.error("Comment deletion error: ", error);
      toast.error('Operation failed', formatErrorForToast(handleApiError(error, defaultErrors)));
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
      const rawCommentsData = response.data.results || [];
      
      // Initialize is_replying for comments and their replies
      const commentsData = rawCommentsData.map((comment: Comment) => ({
        ...comment,
        is_replying: false,
        replies: comment.replies?.map((reply: Comment) => ({
          ...reply,
          is_replying: false
        }))
      }));
      
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
      toast.error('Operation failed', formatErrorForToast(handleApiError(error, defaultErrors)));
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
        toast.error('Failed to load posts', formatErrorForToast(message));
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
      setSubmittingPost(true);

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

      toast.success(`Post ${editing ? "updated" : "created"}`, 'Your post has been saved successfully');
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
      const message = handleApiError(error, undefined, true, true)
      toast.error('Operation failed', formatErrorForToast(message));
    } finally {
      setSubmittingPost(false);
    }
  };

  const deletePost = async (postId: string, channel_id?: string, user_id?: number) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      await post.delete(`/delete/${postId}/`, { data: { confirm: true } });
      toast.success("Post deleted", "The post has been removed successfully");

      // Refresh posts with context (channel or user)
      refreshPosts(channel_id, user_id);
    } catch (error) {
      console.error("Post deletion error: ", error);
      toast.error('Operation failed', formatErrorForToast(handleApiError(error, defaultErrors)));
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
    setPosts,
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
    submittingPost,
    setSubmittingPost,
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
    submittingCritique,
    setSubmittingCritique,
    fetchCritiquesForPost,
    handleCritiqueSubmit,
    deleteCritique,
    
    // Critique reply functionality
    critiqueReplyForms,
    loadingCritiqueReplies,
    submittingCritiqueReply,
    handleCritiqueReplySubmit,
    fetchRepliesForCritique,
    setupCritiqueReplyForm,
    handleCritiqueReplyFormChange,
    toggleCritiqueReplies,
    toggleCritiqueReplyForm,

    // Praise functionality
    praisePost,
    fetchPraiseStatus,
    loadingPraise,
    praiseStatus,
    showPraiseListModal,
    selectedPostForPraiseList,
    openPraiseListModal,
    closePraiseListModal,

    // Trophy functionality
    awardTrophy,
    fetchTrophyStatus,
    loadingTrophy,
    trophyStatus,
    showTrophyModal,
    setShowTrophyModal,
    selectedPostForTrophy,
    openTrophyModal,
    closeTrophyModal,
    showTrophyListModal,
    selectedPostForTrophyList,
    openTrophyListModal,
    closeTrophyListModal,
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
