import { usePostContext } from "@context/post-context"
import type { Post, Comment } from "@types"

const usePost = () => {

    const { 
        // Posts
        setSelectedPost, 
        setPostForm, 
        setEditing, 
        setShowPostForm,

        // Comments
        setCommentForm, 
        setSelectedComment, 
        setShowCommentForm, 
        expandedPost, 
        fetchCommentsForPost, 
        setExpandedPost
     } = usePostContext()

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
        })) || [{ chapter: '', content: '' }],
        ...(postItem.channel_id && { channel_id: postItem.channel_id }),    // Assign channel_id if exists
        });
        setEditing(true);
        setShowPostForm(true);
    };

    // Comments
    const handleCommentFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setCommentForm((prev) => ({ ...prev, [name]: value }));
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
  
      const setupNewComment = (postId: string) => {
        setCommentForm({ text: '', post_id: postId })
        setEditing(false)
        setSelectedComment(null)
        setShowCommentForm(true)
      }
  
    const toggleComments = async (postId: string) => {
      if (expandedPost !== postId) {
        // Fetch first page when expanding a post
        await fetchCommentsForPost(postId, 1, false);
      }
      setExpandedPost(expandedPost === postId ? null : postId);
    };

    return {
        setupEditPost,
        handleCommentFormChange,
        setupEditComment,
        setupNewComment,
        toggleComments
    }
}

export default usePost