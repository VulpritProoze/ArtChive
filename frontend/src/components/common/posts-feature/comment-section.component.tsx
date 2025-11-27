import type { Comment } from '@types';
import { ReplyComponent } from '@components/common';

interface CommentSectionProps {
  postId: string;
  comments: Comment[];
  totalCount?: number;
  isLoading?: boolean;
  highlightedItemId?: string | null;
  onAddComment?: () => void;
  showAddButton?: boolean;
}

const CommentSection = ({
  postId,
  comments,
  totalCount,
  isLoading = false,
  highlightedItemId,
  onAddComment,
  showAddButton = true,
}: CommentSectionProps) => {
  const commentCount = isLoading && !comments.length ? undefined : totalCount ?? comments.length;

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold">
          Comments {commentCount !== undefined ? `(${commentCount})` : ''}
        </h4>
        {showAddButton && onAddComment && (
          <button className="btn btn-sm btn-primary" onClick={onAddComment}>
            Add Comment
          </button>
        )}
      </div>

      {isLoading && comments.length === 0 ? (
        <div className="text-center py-4">
          <div className="loading loading-spinner loading-sm" />
          <span className="ml-2">Loading comments...</span>
        </div>
      ) : comments.length === 0 ? (
        <p className="text-gray-500 text-sm mb-2">No comments yet.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <ReplyComponent
              key={comment.comment_id}
              comment={comment}
              postId={postId}
              highlightedItemId={highlightedItemId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentSection;

