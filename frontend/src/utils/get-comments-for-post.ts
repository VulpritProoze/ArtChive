import type { Comment } from "@types";

const getCommentsForPost = (postId: string, comments: Comment[] ) => {
    return comments[postId] || [];
};

export default getCommentsForPost