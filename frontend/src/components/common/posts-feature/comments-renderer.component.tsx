import { usePostContext } from '@context/post-context'
import usePost from '@hooks/use-post'
import { getCommentsForPost } from '@utils'

const CommentsRenderer = ({postId}: {postId: string}) => {
    const { commentPagination, loadingComments, loadMoreComments, deleteComment, comments } = usePostContext()
    const { setupEditComment, setupNewComment } = usePost()

    const isLoading = loadingComments[postId]
    const pagination = commentPagination[postId]
    const postComments = getCommentsForPost(postId, comments)

    return (
      <div className="mt-4 border-t pt-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-semibold">
            Comments ({isLoading ? '...' : pagination?.totalCount || postComments.length})
          </h4>
          <button 
            className="btn btn-sm btn-primary"
            onClick={() => setupNewComment(postId)}
          >
            Add Comment
          </button>
        </div>
        
        {isLoading && postComments.length === 0 ? (
          <div className="text-center py-4">
            <div className="loading loading-spinner loading-sm"></div>
            <span className="ml-2">Loading comments...</span>
          </div>
        ) : postComments.length === 0 ? (
          <p className="text-gray-500 text-sm">No comments yet.</p>
        ) : (
          <>
            <div className="space-y-3">
            {postComments.map(comment => (
                <div key={comment.comment_id} className="bg-base-200 p-3 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{comment.author_username}</p>
                      <p className="text-sm">{comment.text}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      <button 
                        className="btn btn-xs btn-secondary"
                        onClick={() => setupEditComment(comment)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-xs btn-error"
                        onClick={() => deleteComment(comment.comment_id, postId)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Load More Button */}
            {pagination?.hasNext && (
              <div className="mt-4 text-center">
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => loadMoreComments(postId)}
                  disabled={loadingComments[postId]}
                >
                  {loadingComments[postId] ? (
                    <>
                      <div className="loading loading-spinner loading-xs"></div>
                      Loading more...
                    </>
                  ) : (
                    `Load More (${postComments.length} of ${pagination.totalCount})`
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    )
}

export default CommentsRenderer