import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { post as postApi } from "@lib/api";
import type { Post } from "@types";
import { PostCard } from "@components/common/posts-feature";
import { PostProvider, usePostContext } from "@context/post-context";
import { MainLayout } from "@components/common/layout/MainLayout";
import { LoadingSpinner } from "../loading-spinner";
import { toast } from "@utils/toast.util";
import { handleApiError, formatErrorForToast } from "@utils";
import { postService } from "@services/post.service";
import { CommentFormModal, PostFormModal } from "@components/common/posts-feature/modal";

interface PostCardPostItem extends Post {
  novel_post: any[];
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
        const response = await postApi.get(`/${postId}/`);
        setPost(response.data);
      } catch (err: any) {
        console.error("Error fetching post:", err);
        const message = handleApiError(err, {}, true, true);
        setError(Array.isArray(message) ? message[0] : message);

        // If post not found (404), redirect to 404 page
        if (err.response?.status === 404) {
          navigate("/404", { replace: true });
        } else {
          toast.error('Failed to load post', formatErrorForToast(message));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId, navigate]);

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
          <LoadingSpinner text={"Loading..."}/>
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
    <PostProvider>
      <MainLayout>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <button
            onClick={() => navigate('/home')}
            className="btn btn-ghost btn-sm mb-4"
          >
            ← Back
          </button>
          <PostCard postItem={post} highlightedItemId={highlightedItemId} isDetailView={true} />
        </div>
        <PostDetailModals />
      </MainLayout>
    </PostProvider>
  );
}

// Separate component to access PostContext
function PostDetailModals() {
  const { showCommentForm, showPostForm } = usePostContext();
  
  return (
    <>
      {showCommentForm && <CommentFormModal />}
      {showPostForm && <PostFormModal />}
    </>
  );
}
