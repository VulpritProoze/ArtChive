import React from "react";
import CommentsRenderer from "./CommentsRenderer";

interface CommentsModalProps {
  post: any | null;
  isOpen: boolean;
  onClose: () => void;
}

const CommentsModal: React.FC<CommentsModalProps> = ({ post, isOpen, onClose }) => {
  if (!isOpen || !post) return null; // 🔒 prevent rendering when no post

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // close when clicking background
      }}
    >
      <div className="bg-base-100 w-[90%] h-[90%] rounded-lg overflow-hidden flex">
        
        {/* Left: Post Content */}
        <div className="flex-1 bg-black flex items-center justify-center">
          {post.post_type === 'image' && post.image_url && (
            <img 
              src={post.image_url} 
              alt={post.description || "Post"} 
              className="max-h-full max-w-full object-contain" 
            />
          )}
          {post.post_type === 'video' && post.video_url && (
            <video controls className="max-h-full max-w-full object-contain">
              <source src={post.video_url} type="video/mp4" />
            </video>
          )}
        </div>

        {/* Right: Comments */}
        <div className="w-[400px] flex flex-col border-l border-base-300">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-base-300">
            <p className="font-semibold">chenoborg_art</p>
            <button onClick={onClose} className="btn btn-ghost btn-sm">✕</button>
          </div>

          {/* Caption */}
          <div className="p-4 border-b border-base-300">
            <p className="text-sm">
              <span className="font-semibold">chenoborg_art</span> {post.description}
            </p>
          </div>

          {/* Comments */}
          <div className="flex-1 overflow-y-auto p-4">
            <CommentsRenderer postId={post.post_id} />
          </div>

          {/* Comment Input */}
          <div className="border-t border-base-300 p-3 flex gap-2">
            <input 
              type="text" 
              placeholder="Add a comment..." 
              className="flex-1 input input-bordered input-sm"
            />
            <button className="btn btn-primary btn-sm">Send</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentsModal;
