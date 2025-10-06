import React from 'react';
import { usePostContext } from '@context/post-context';
import usePost from '@hooks/use-post';
import type { Comment } from '@types';

interface ReplyComponentProps {
  comment: Comment;
  postId: string;
  depth?: number;
}

const ReplyComponent: React.FC<ReplyComponentProps> = ({ 
  comment, 
  postId, 
  depth = 0 
}) => {
  const { 
    handleReplySubmit, 
    replyForms, 
    loadingReplies,
    deleteComment,
    toggleReplyForm 
  } = usePostContext();
  
  const { 
    setupNewReply, 
    handleReplyChange, 
    handleToggleReplies,
    setupEditComment,
  } = usePost();

  const replyForm = replyForms[comment.comment_id];
  const isLoadingReplies = loadingReplies[comment.comment_id];
  const replyCount = comment.reply_count || 0;
  const hasReplies = replyCount > 0;
  const isTopLevel = depth === 0;

  return (
    <div className={`${depth > 0 ? 'ml-12 mt-3' : 'py-3 border-b border-gray-100'}`}>
      {/* Comment Content */}
      <div className="flex gap-3">
        {/* User Avatar */}
        <div className="flex-shrink-0">
          {comment.author_picture ? (
            <img
              src={comment.author_picture}
              alt="author_pic"
              className="w-8 h-8 rounded-full border border-base-300"
            />
          ) : (
          <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {comment.author_username?.charAt(0).toUpperCase() || 'U'}
          </div>
          )}
        </div>
        
        {/* Comment Body */}
        <div className="flex-1 min-w-0">
          {/* Username and Text */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm text-gray-900">
                  {comment.author_username}
                </span>
                <span className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                  {comment.text}
                </span>
              </div>
              
              {/* Time and Actions */}
              <div className="flex items-center gap-4 mt-1">
                <span className="text-xs text-gray-400">
                  {new Date(comment.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
                
                {/* Reply Button - only for top-level comments */}
                {isTopLevel && (
                  <button 
                    className="text-xs font-semibold cursor-pointer text-gray-500 hover:text-gray-700 transition-colors"
                    onClick={() => setupNewReply(comment.comment_id, postId)}
                  >
                    Reply
                  </button>
                )}
                
                {/* Show Replies Toggle - only for top-level comments with replies */}
                {isTopLevel && hasReplies && (
                  <button 
                    className="text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
                    onClick={() => handleToggleReplies(comment.comment_id)}
                    disabled={isLoadingReplies}
                  >
                      <span className='cursor-pointer flex flex-row gap-1 items-center'>
                        {isLoadingReplies && comment.show_replies && (
                          <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin">
                          </div>)
                        }{" "}
                        {comment.show_replies ? 'Hide' : 'View'}{" "}
                        {replyCount}{" "}
                        {replyCount === 1 ? 'reply' : 'replies'}
                      </span>
                  </button>
                )}
              </div>
            </div>

            {/* Action Menu (3 dots) */}
            <div className="relative group">
              <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="1.5"/>
                  <circle cx="6" cy="12" r="1.5"/>
                  <circle cx="18" cy="12" r="1.5"/>
                </svg>
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 top-6 hidden group-hover:block bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[120px]">
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setupEditComment(comment)}
                >
                  Edit
                </button>
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 transition-colors"
                  onClick={() => deleteComment(comment.comment_id, postId)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* Reply Form */}
          {comment.is_replying && (
            <div className="mt-3 flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={replyForm?.text || ''}
                  onChange={(e) => handleReplyChange(comment.comment_id, e.target.value)}
                  placeholder="Add a reply..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:border-gray-400"
                  required
                  autoFocus
                />
              </div>
              <button 
                type="button"
                className="text-sm font-semibold text-blue-500 hover:text-blue-700 disabled:text-blue-300 transition-colors"
                onClick={() => toggleReplyForm(comment.comment_id)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="text-sm font-semibold text-blue-500 hover:text-blue-700 disabled:text-blue-300 transition-colors"
                onClick={(e) => handleReplySubmit(e, comment.comment_id)}
                disabled={!replyForm?.text?.trim()}
              >
                Post
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {comment.show_replies && comment.replies && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <ReplyComponent 
              key={reply.comment_id} 
              comment={reply} 
              postId={postId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {/* View Replies Line - Instagram style */}
      {isTopLevel && hasReplies && !comment.show_replies && (
        <div className="mt-2 flex items-center gap-2">
          <div className="w-8 flex justify-center">
            <div className="w-0.5 h-6 bg-gray-300"></div>
          </div>
          <button 
            className="text-xs font-semibold cursor-pointer text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
            onClick={() => handleToggleReplies(comment.comment_id)}
            disabled={isLoadingReplies}
          >
            {isLoadingReplies ? (
              <>
                <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin"></div>
                Loading replies...
              </>
            ) : (
              `View replies (${replyCount})`
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ReplyComponent;