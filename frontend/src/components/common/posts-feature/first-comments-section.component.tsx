import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComment } from '@fortawesome/free-solid-svg-icons';
import type { Post } from '@types';
import { ReplyComponent } from '@components/common';
import { usePostUI } from '@context/post-ui-context';
import { useComments } from '@hooks/queries/use-comments';

interface FirstCommentsSectionProps {
  postItem: Post;
}

const FirstCommentsSection = ({ postItem }: FirstCommentsSectionProps) => {
  const { openPostModal } = usePostUI();
  const { data, isLoading } = useComments(postItem.post_id, { pageSize: 2 });

  const comments = data?.pages.flatMap((page) => page.results || []) ?? [];
  const topLevelComments = comments.filter((comment) => !comment.replies_to);
  const totalComments = data?.pages[0]?.total_comments ?? postItem.comment_count ?? 0;

  if (isLoading && topLevelComments.length === 0) {
    return (
      <div className="mt-2">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-semibold">Comments (...) </h4>
        </div>
        <div className="text-center py-4">
          <span className="loading loading-spinner loading-sm" />
          <span className="ml-2">Loading comments...</span>
        </div>
      </div>
    );
  }

  if (!topLevelComments.length) {
    return (
      <div className="text-center py-6">
        <div className="inline-block p-4 rounded-full bg-base-200 mb-4">
          <FontAwesomeIcon icon={faComment} className="text-2xl text-gray-400" />
        </div>
        <p className="text-lg font-medium text-gray-600">No comments yet</p>
        <p className="text-sm text-gray-500 mt-1">Be the first to share your thoughts!</p>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold">Comments ({totalComments})</h4>
        <button
          className="text-sm hover:link"
          onClick={() => openPostModal(postItem)}
        >
          View all {totalComments} comments
        </button>
      </div>

      <div className="space-y-3">
        {topLevelComments.map((comment) => (
          <ReplyComponent
            key={comment.comment_id}
            comment={comment}
            postId={postItem.post_id}
            highlightedItemId={null}
          />
        ))}
      </div>
    </div>
  );
};

export default FirstCommentsSection;

