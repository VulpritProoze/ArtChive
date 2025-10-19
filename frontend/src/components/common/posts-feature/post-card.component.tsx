import type { NovelPost, Post } from "@types";
import {
  PostHeader,
  NovelRenderer,
  HeartButton,
  CommentsRenderer,
  CritiqueSection,
} from "@components/common/posts-feature";
import { 
  PraiseListModal,
  TrophyListModal,
} from "@components/common/posts-feature/modal"
import { usePostContext } from "@context/post-context";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBookmark,
  faCommentDots,
  faPaperPlane,
  faStar,
  faHandsClapping,
  faTrophy,
} from "@fortawesome/free-solid-svg-icons";
import { useState, useEffect } from "react";

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
    fetchCritiquesForPost,
    praisePost,
    loadingPraise,
    praiseStatus,
    fetchPraiseStatus,
    openTrophyModal,
    trophyStatus,
    fetchTrophyStatus,
    openPraiseListModal,
    closePraiseListModal,
    showPraiseListModal,
    selectedPostForPraiseList,
    openTrophyListModal,
    closeTrophyListModal,
    showTrophyListModal,
    selectedPostForTrophyList,
  } = usePostContext();

  const [activeSection, setActiveSection] = useState<"comments" | "critiques">(
    "comments"
  );

  // Fetch praise and trophy status on mount
  useEffect(() => {
    fetchPraiseStatus(postItem.post_id);
    fetchTrophyStatus(postItem.post_id);
  }, [postItem.post_id]);

  const currentPraiseStatus = praiseStatus[postItem.post_id];
  const currentTrophyStatus = trophyStatus[postItem.post_id];

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

              {/* Heart */}
              <HeartButton
                postId={postItem.post_id}
                heartsCount={postItem.hearts_count || 0}
                isHearted={postItem.is_hearted_by_user || false}
                onHeart={heartPost}
                onUnheart={unheartPost}
                isLoading={loadingHearts[postItem.post_id]}
                size="lg"
              />

              {/* Comment */}
              <button
                className={`btn btn-ghost btn-sm btn-circle ${
                  activeSection === "comments" ? "text-primary" : ""
                }`}
                onClick={() => {
                  setActiveSection("comments")
                }}
                disabled={loadingComments[postItem.post_id]}
              >
                <FontAwesomeIcon
                  icon={faCommentDots}
                  className="text-xl hover:scale-110 transition-transform"
                />
              </button>

              {/* Critique */}
              <button
                className={`btn btn-ghost btn-sm btn-circle relative ${
                  activeSection === "critiques" ? "text-primary" : ""
                }`}
                onClick={() => {
                  setActiveSection("critiques")
                  fetchCritiquesForPost(postItem.post_id, 1, false)
                }}
                disabled={loadingCritiques[postItem.post_id]}
              >
                <FontAwesomeIcon
                  icon={faStar}
                  className="text-xl hover:scale-110 transition-transform"
                />
              </button>

              {/* Praise */}
              <button
                className={`btn btn-ghost btn-sm btn-circle relative ${
                  currentPraiseStatus?.isPraised ? "text-warning" : ""
                }`}
                onClick={() => praisePost(postItem.post_id)}
                disabled={
                  loadingPraise[postItem.post_id] ||
                  currentPraiseStatus?.isPraised
                }
                title={
                  currentPraiseStatus?.isPraised
                    ? "Already praised"
                    : "Praise this post (1 Brush Drip)"
                }
              >
                {loadingPraise[postItem.post_id] ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <FontAwesomeIcon
                    icon={faHandsClapping}
                    className="text-xl hover:scale-110 transition-transform"
                  />
                )}
              </button>

              {/* Trophy */}
              <button
                className="btn btn-ghost btn-sm btn-circle relative"
                onClick={() => openTrophyModal(postItem.post_id)}
                title="Award a trophy"
              >
                <FontAwesomeIcon
                  icon={faTrophy}
                  className="text-xl hover:scale-110 transition-transform"
                />
                {currentTrophyStatus?.userAwarded &&
                  currentTrophyStatus.userAwarded.length > 0 && (
                    <span className="absolute -top-1 -right-1 badge badge-xs badge-warning">
                      {currentTrophyStatus.userAwarded.length}
                    </span>
                  )}
              </button>

              {/* Share (no implementation yet) */}
              <button className="btn btn-ghost btn-sm btn-circle">
                <FontAwesomeIcon
                  icon={faPaperPlane}
                  className="text-xl hover:scale-110 transition-transform"
                />
              </button>
            </div>

              {/* Bookmark (no implementation yet) */}
            <button className="btn btn-ghost btn-sm btn-circle">
              <FontAwesomeIcon
                icon={faBookmark}
                className="text-xl hover:scale-110 transition-transform"
              />
            </button>
          </div>

          {/* Likes Count */}
          <div className="mb-2 flex flex-row gap-3 items-center flex-wrap">
            <p className="text-sm font-semibold text-base-content">
              {postItem.hearts_count || 0} likes
            </p>

            {/* Praise Count - Clickable */}
            {currentPraiseStatus && currentPraiseStatus.count > 0 && (
              <button
                onClick={() => openPraiseListModal(postItem.post_id)}
                className="text-sm font-semibold text-warning hover:underline cursor-pointer transition-all hover:scale-105"
              >
                {currentPraiseStatus.count} praises
              </button>
            )}

            {/* Trophy Count - Clickable */}
            {currentTrophyStatus && currentTrophyStatus.counts && (
              <button
                onClick={() => openTrophyListModal(postItem.post_id)}
                className="flex gap-2 text-sm hover:opacity-80 transition-all cursor-pointer"
              >
                {currentTrophyStatus.counts.bronze_stroke > 0 && (
                  <span className="text-orange-700 font-semibold">
                    🥉 {currentTrophyStatus.counts.bronze_stroke}
                  </span>
                )}
                {currentTrophyStatus.counts.golden_bristle > 0 && (
                  <span className="text-yellow-600 font-semibold">
                    🥈 {currentTrophyStatus.counts.golden_bristle}
                  </span>
                )}
                {currentTrophyStatus.counts.diamond_canvas > 0 && (
                  <span className="text-blue-600 font-semibold">
                    🥇 {currentTrophyStatus.counts.diamond_canvas}
                  </span>
                )}
              </button>
            )}

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

      {/* Praise List Modal */}
      {showPraiseListModal && selectedPostForPraiseList === postItem.post_id && (
        <PraiseListModal
          isOpen={showPraiseListModal}
          onClose={closePraiseListModal}
          postId={postItem.post_id}
        />
      )}

      {/* Trophy List Modal */}
      {showTrophyListModal && selectedPostForTrophyList === postItem.post_id && (
        <TrophyListModal
          isOpen={showTrophyListModal}
          onClose={closeTrophyListModal}
          postId={postItem.post_id}
        />
      )}
    </>
  );
}
