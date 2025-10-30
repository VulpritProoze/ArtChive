import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { post as postApi } from "@lib/api";
import type { Post } from "@types";
import { PostCard } from "@components/common/posts-feature";
import { PostProvider } from "@context/post-context";
import { MainLayout } from "@components/common/layout/MainLayout";
import { LoadingSpinner } from "../loading-spinner";
import { toast } from "react-toastify";
import { handleApiError } from "@utils";

interface PostCardPostItem extends Post {
  novel_post: any[];
}

export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostCardPostItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const message = handleApiError(err, {});
        setError(message);

        // If post not found (404), redirect to 404 page
        if (err.response?.status === 404) {
          navigate("/404", { replace: true });
        } else {
          toast.error(message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId, navigate]);

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
            onClick={() => navigate(-1)}
            className="btn btn-ghost btn-sm mb-4"
          >
            ← Back
          </button>
          <PostCard postItem={post} />
        </div>
      </MainLayout>
    </PostProvider>
  );
}
