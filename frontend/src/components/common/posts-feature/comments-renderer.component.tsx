// comments-renderer.tsx
import { usePostContext } from '@context/post-context'
import usePost from '@hooks/use-post'
import { getCommentsForPost } from '@utils'

const CommentsRenderer = ({postId, isFirstComments = true, showLoadMore = false}: {postId: string, isFirstComments?: boolean, showLoadMore?: boolean}) => {
    const { commentPagination, loadingComments, deleteComment, comments } = usePostContext()
    const { setupEditComment, setupNewComment } = usePost()

    const isLoading = loadingComments[postId]
    const pagination = commentPagination[postId]
    const postComments = getCommentsForPost(postId, comments)

    // Return early if isFirstComments is true and we need to show only the last comment blurred
    if (isFirstComments) {
      // Get the last 2 comments (or all if less than 2)
      const lastTwoComments = postComments.slice(-2);
      
      return (
          <div className="mt-2 p-3">
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
              
              <div className="space-y-2 relative">
                  {/* Fading overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-base-100 via-transparent to-transparent pointer-events-none z-10 mb-2" />
                  
                  {/* Last two comments with decreasing opacity */}
                  {lastTwoComments.map((comment, index) => {
                      // Calculate opacity: first comment (more recent) is more visible, second is more faded
                      const opacity = 1 - (index * 0.4); // 100% for first, 60% for second
                      const blur = index * 1; // 0px for first, 1px for second
                      
                      return (
                          <div 
                              key={comment.comment_id} 
                              className="bg-base-200 p-3 rounded-lg transition-all duration-300"
                              style={{
                                  opacity: opacity,
                                  filter: `blur(${blur}px)`,
                              }}
                          >
                              <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                      <p className="font-medium text-sm">{comment.author_username}</p>
                                      <p className="text-sm">{comment.text}</p>
                                      <p className="text-xs text-gray-500">
                                          {new Date(comment.created_at).toLocaleString()}
                                      </p>
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )
  }

    // Normal rendering for non-first comments or when there are no more pages
    return (
      <div className="mt-2">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-semibold">
            Comments ({isLoading ? '...' : pagination?.totalCount || postComments.length})
          </h4>
          {!showLoadMore && (
            <button 
              className="btn btn-sm btn-primary"
              onClick={() => setupNewComment(postId)}
            >
              Add Comment
            </button>
          )}
        </div>
        
        {isLoading && postComments.length === 0 ? (
          <div className="text-center py-4">
            <div className="loading loading-spinner loading-sm"></div>
            <span className="ml-2">Loading comments...</span>
          </div>
        ) : postComments.length === 0 ? (
          <p className="text-gray-500 text-sm mb-2">No comments yet.</p>
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
          </>
        )}
      </div>
    )
}

export default CommentsRenderer