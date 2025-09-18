import { usePostContext } from "@context/post-context"
import type { Post } from "@types"

const usePost = () => {

    const { setSelectedPost, setPostForm, setEditing, setShowPostForm } = usePostContext()

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
        })) || [{ chapter: '', content: '' }]
        });
        setEditing(true);
        setShowPostForm(true);
    };


    return {
        setupEditPost,
    }
}

export default usePost