import type { NovelPost, Post } from "@types";
import {
  PostHeader,
  NovelRenderer,
  HeartButton,
  CommentsRenderer,
  CritiqueSection,
} from "@components/common/posts-feature";
import { usePostContext } from "@context/post-context";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBookmark,
  faCommentDots,
  faPaperPlane,
  faStar,
} from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";

interface PostCardPostItem extends Post {
  novel_post: NovelPost[];
}

export default function PostCard({ postItem }: { postItem: PostCardPostItem }) {
  const {
    heartPost,
    unheartPost,
    loadingHearts,
    loadingComments,
    loadingCritiques,
  } = usePostContext();

  const [activeSection, setActiveSection] = useState<"comments" | "critiques">(
    "comments"
  );

  return (
    <>
      <div
        key={postItem.post_id}
        className="card bg-base-100 border border-base-300 rounded-xl shadow-sm"
      >
        {/* Post Header - Instagram Style */}
        <PostHeader postItem={postItem} />

        {/* Media Content */}
        {postItem.post_type === "image" && postItem.image_url && (
          <div className="w-full h-96 bg-black flex items-center justify-center overflow-hidden">
            <img
              src={postItem.image_url}
              alt={postItem.description}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {postItem.post_type === "video" && postItem.video_url && (
          <div className="w-full h-96 bg-black flex items-center justify-center overflow-hidden">
            <video controls className="w-full h-full object-cover">
              <source src={postItem.video_url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {postItem.post_type === "novel" &&
          postItem.novel_post &&
          postItem.novel_post.length > 0 && (
            <NovelRenderer postItem={postItem} />
          )}

        {/* Text-only post (default type) */}
        {(!postItem.post_type || postItem.post_type === "default") && (
          <div className="p-6 bg-base-100">
            <div className="prose max-w-none">
              <p className="text-base-content whitespace-pre-wrap">
                {postItem.description}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <HeartButton
                postId={postItem.post_id}
                heartsCount={postItem.hearts_count || 0}
                isHearted={postItem.is_hearted_by_user || false}
                onHeart={heartPost}
                onUnheart={unheartPost}
                isLoading={loadingHearts[postItem.post_id]}
                size="lg"
              />

              <button
                className={`btn btn-ghost btn-sm btn-circle ${
                  activeSection === "comments" ? "text-primary" : ""
                }`}
                onClick={() => setActiveSection("comments")}
                disabled={loadingComments[postItem.post_id]}
              >
                <FontAwesomeIcon
                  icon={faCommentDots}
                  className="text-xl hover:scale-110 transition-transform"
                />
              </button>

              <button
                className={`btn btn-ghost btn-sm btn-circle relative ${
                  activeSection === "critiques" ? "text-primary" : ""
                }`}
                onClick={() => setActiveSection("critiques")}
                disabled={loadingCritiques[postItem.post_id]}
              >
                <FontAwesomeIcon
                  icon={faStar}
                  className="text-xl hover:scale-110 transition-transform"
                />
              </button>

              <button className="btn btn-ghost btn-sm btn-circle">
                <FontAwesomeIcon
                  icon={faPaperPlane}
                  className="text-xl hover:scale-110 transition-transform"
                />
              </button>
            </div>

            <button className="btn btn-ghost btn-sm btn-circle">
              <FontAwesomeIcon
                icon={faBookmark}
                className="text-xl hover:scale-110 transition-transform"
              />
            </button>
          </div>

          {/* Likes Count */}
          <div className="mb-2 flex flex-row gap-2 items-center">
            <p className="text-sm font-semibold text-base-content">
              {postItem.hearts_count || 0} likes
            </p>

            {/* Time Posted */}
            <p className="text-xs text-base-content/50 uppercase">
              {new Date(postItem.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          {/* Caption - Only show for non-text posts */}
          {postItem.post_type && postItem.post_type !== "default" && (
            <div className="mb-2">
              <p className="text-sm text-base-content">
                <span className="font-semibold">
                  {postItem.author_username}
                </span>{" "}
                {postItem.description}
              </p>
            </div>
          )}

          {/* Conditional Rendering based on active section */}
          {activeSection === "comments" ? (
            <>
              {/* Comments Preview - Show blurred first comment */}
              <CommentsRenderer
                postItem={postItem}
                isFirstComments={true}
              />
            </>
          ) : (
            <>
              {/* Critique Section */}
              <CritiqueSection postId={postItem.post_id} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
