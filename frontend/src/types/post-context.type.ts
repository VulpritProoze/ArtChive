import type { Pagination } from "./pagination.type"

export type PostContextType = {
    comments,
    setComments,
    commentForm,
    setCommentForm,
    editing,
    setEditing,
    commentPagination: { [postId: string]: Pagination },
    loadingComments: { [postId: string]: boolean },    
    fetchCommentsForPost: (postId: string, page: number, append: boolean) => Promise<void>,
    loadMoreComments: (postId: string) => Promise<void>,
    handleCommentSubmit: (e: React.FormEvent) => Promise<void>,
    deleteComment: (commentId: string, postId: string) => Promise<void>
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

    // Hearting Functionality
    heartPost: (postId: string) => Promise<void>;
    unheartPost: (postId: string) => Promise<void>;
    loadingHearts: { [postId: string]: boolean };

}