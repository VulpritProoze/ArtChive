import React from "react"
import { usePostContext } from "@context/post-context"
import type { Comment } from "@types"

const usePostComment = () => {

    const { setCommentForm, setSelectedComment, setEditing, setShowCommentForm, expandedPost, fetchCommentsForPost, setExpandedPost } = usePostContext()

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
        handleCommentFormChange,
        setupEditComment,
        setupNewComment,
        toggleComments
    }
}

export default usePostComment