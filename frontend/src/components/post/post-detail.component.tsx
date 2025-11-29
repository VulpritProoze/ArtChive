import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import type { Post, NovelPost } from "@types";
import { PostCard } from "@components/common/posts-feature";
import { MainLayout } from "@components/common/layout/MainLayout";
import { LoadingSpinner } from "../loading-spinner";
import { toast } from "@utils/toast.util";
import { handleApiError, formatErrorForToast } from "@utils";
import { postService } from "@services/post.service";
import { CommentFormModal, PostFormModal, TrophySelectionModal } from "@components/common/posts-feature/modal";
import { usePostUI } from "@context/post-ui-context";
import { usePostMeta } from "@hooks/queries/use-post-meta";
import { useMemo } from "react";

interface PostCardPostItem extends Post {
  novel_post: NovelPost[];
}

export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [post, setPost] = useState<PostCardPostItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) {
        setError("Post ID is missing");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const postData = await postService.getPost(postId);
        // Ensure novel_post is always an array (never undefined)
        const postWithNovel: PostCardPostItem = {
          ...postData,
          novel_post: postData.novel_post || [],
        };
        setPost(postWithNovel);
      } catch (err: unknown) {
        console.error("Error fetching post:", err);
        const message = handleApiError(err, {}, true, true);
        setError(Array.isArray(message) ? message[0] : message);

        // If post not found (404), redirect to home (post was likely deleted)
        if (err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'status' in err.response && err.response.status === 404) {
          navigate("/home", { replace: true });
        } else {
          toast.error('Failed to load post', formatErrorForToast(message));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId, navigate]);

  // Listen for post deletion event - navigate to home when current post is deleted
  useEffect(() => {
    if (!postId) return;

    const handlePostDeleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ postId: string }>;
      // Check if the deleted post matches the current post
      if (customEvent.detail?.postId === postId) {
        navigate('/home', { replace: true });
      }
    };

    window.addEventListener('postDeleted', handlePostDeleted);

    return () => {
      window.removeEventListener('postDeleted', handlePostDeleted);
    };
  }, [postId, navigate]);

  const { data: metaData } = usePostMeta(postId);

  const enrichedPost = useMemo(() => {
    if (!post) return null;
    return {
      ...post,
      ...(metaData || {}),
      is_hearted_by_user: metaData?.is_hearted ?? post.is_hearted_by_user,
      is_praised_by_user: metaData?.is_praised ?? post.is_praised_by_user,
      trophy_counts_by_type: metaData?.trophy_breakdown || post.trophy_counts_by_type,
      user_awarded_trophies: metaData?.user_trophies || post.user_awarded_trophies,
    };
  }, [post, metaData]);

  // Handle hash navigation and highlighting
  useEffect(() => {
    if (!post || loading) return;

    const hash = location.hash;
    if (hash) {
      // Set highlighted item without # (e.g., comment-123, critique-456, reply-789)
      const itemId = hash.substring(1);
      setHighlightedItemId(itemId);

      // Scroll to element after a short delay to ensure it's rendered
      setTimeout(() => {
        const element = document.getElementById(itemId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Remove highlight after 3 seconds
          setTimeout(() => {
            setHighlightedItemId(null);
          }, 3000);
        } else {
          // Element not found in DOM - fetch it from API
          fetchHighlightedItem(itemId);
        }
      }, 300);
    }
  }, [location.hash, post, loading]);

  const fetchHighlightedItem = async (itemId: string) => {
    try {
      const parts = itemId.split('-');
      const type = parts[0]; // comment, reply, critique, critique-reply
      const id = parts.slice(1).join('-'); // ID (may contain hyphens for UUIDs)

      if (type === 'comment' || type === 'reply') {
        // Fetch comment with context (includes parent and all replies if it's a reply)
        const data = await postService.getCommentWithContext(id);

        // TODO: Update post context with the fetched comment/replies
        // For now, just show a message and retry scrolling
        console.log('Fetched comment context:', data);

        // Retry scrolling after a brief delay
        setTimeout(() => {
          const element = document.getElementById(itemId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => setHighlightedItemId(null), 3000);
          }
        }, 500);
      } else if (type === 'critique' || (type === 'critique' && parts[1] === 'reply')) {
        // Fetch critique with context
        const critiqueId = type === 'critique' && parts[1] === 'reply' ? parts[2] : id;
        const data = await postService.getCritiqueWithContext(critiqueId);

        console.log('Fetched critique context:', data);

        // Retry scrolling
        setTimeout(() => {
          const element = document.getElementById(itemId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => setHighlightedItemId(null), 3000);
          }
        }, 500);
      }
    } catch (error) {
      console.error('Failed to fetch highlighted item:', error);
      const message = handleApiError(error, {}, true, true);
      toast.error('Could not load the comment/critique', formatErrorForToast(message));
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner text={"Loading..."} />
        </div>
      </MainLayout>
    );
  }

  if (error || !post) {
    return (
      <MainLayout>
        <div className="flex flex-col justify-center items-center min-h-screen gap-4">
          <h1 className="text-2xl font-bold text-error">Error Loading Post</h1>
          <p className="text-base-content/70">{error || "Post not found"}</p>
          <button
            onClick={() => navigate("/home")}
            className="btn btn-primary"
          >
            Go to Home
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <button
          onClick={() => navigate('/home')}
          className="btn btn-ghost btn-sm mb-4"
        >
          ← Back
        </button>
        <PostCard postItem={enrichedPost!} highlightedItemId={highlightedItemId} />
      </div>
      <PostDetailModals />
    </MainLayout>
  );
}

function PostDetailModals() {
  const { showCommentForm, showPostForm } = usePostUI();

  return (
    <>
      {showCommentForm && <CommentFormModal />}
      {showPostForm && <PostFormModal />}
      <TrophySelectionModal />
    </>
  );
}
