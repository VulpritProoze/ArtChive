import type { NovelPost, Post } from "@types";
import {
  PostHeader,
  NovelRenderer,
  HeartButton,
  CritiqueSection,
  DetailedCommentSection,
} from "@components/common/posts-feature";
import {
  PraiseListModal,
  TrophyListModal,
  HeartListModal,
} from "@components/common/posts-feature/modal";
import { usePostUI } from "@context/post-ui-context";
import {
  useHeartPost,
  useUnheartPost,
  usePraisePost,
} from "@hooks/mutations/use-post-mutations";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBookmark,
  faCommentDots,
  faPaperPlane,
  faHandsClapping,
  faTrophy,
  faStar,
} from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";

interface PostCardPostItem extends Post {
  novel_post: NovelPost[];
}

interface PostCardProps {
  postItem: PostCardPostItem;
  highlightedItemId?: string | null;
  countsLoading?: boolean; // NEW: Loading state for counts
  isDetailView?: boolean; // Whether this is in post detail view
}

export default function PostCard({
  postItem,
  highlightedItemId,
  countsLoading = false, // Default to false
  isDetailView = false, // Default to false (feed view)
}: PostCardProps) {
  const {
    showPraiseListModal,
    setShowPraiseListModal,
    selectedPostForPraiseList,
    setSelectedPostForPraiseList,
    showTrophyListModal,
    setShowTrophyListModal,
    selectedPostForTrophyList,
    setSelectedPostForTrophyList,
    showHeartListModal,
    setShowHeartListModal,
    selectedPostForHeartList,
    setSelectedPostForHeartList,
    setShowTrophyModal,
    setSelectedPostForTrophy,
    setSelectedPostTrophyAwards,
    setActivePost,
  } = usePostUI();
  const { mutate: heartPostMutation, isPending: isHearting } = useHeartPost();
  const { mutate: unheartPostMutation, isPending: isUnhearting } = useUnheartPost();
  const { mutate: praisePostMutation, isPending: isPraising } = usePraisePost();
  const praiseCount = postItem.praise_count ?? 0;
  const isPraised = postItem.is_praised_by_user ?? false;
  const trophyCounts = postItem.trophy_counts_by_type ?? {};
  const userAwardedTrophies = postItem.user_awarded_trophies ?? [];
  const isHeartLoading = isHearting || isUnhearting;
  const praiseButtonDisabled = isPraised || isPraising;
  const hasTrophies = Object.values(trophyCounts).some((count) => count > 0);

  const handleHeart = (postId: string) => {
    heartPostMutation({ postId });
  };

  const handleUnheart = (postId: string) => {
    unheartPostMutation({ postId });
  };

  const handlePraise = () => {
    if (praiseButtonDisabled) return;
    if (
      !window.confirm(
        "Are you sure you want to praise this post? This will cost 1 Brush Drip."
      )
    ) {
      return;
    }
    praisePostMutation({ postId: postItem.post_id });
  };

  const handleOpenPraiseList = () => {
    setSelectedPostForPraiseList(postItem.post_id);
    setShowPraiseListModal(true);
  };

  const handleClosePraiseList = () => {
    setShowPraiseListModal(false);
    setSelectedPostForPraiseList(null);
  };

  const handleOpenTrophyList = () => {
    setSelectedPostForTrophyList(postItem.post_id);
    setShowTrophyListModal(true);
  };

  const handleCloseTrophyList = () => {
    setShowTrophyListModal(false);
    setSelectedPostForTrophyList(null);
  };

  const handleOpenHeartList = () => {
    setSelectedPostForHeartList(postItem.post_id);
    setShowHeartListModal(true);
  };

  const handleCloseHeartList = () => {
    setShowHeartListModal(false);
    setSelectedPostForHeartList(null);
  };

  const handleOpenTrophyModal = () => {
    setSelectedPostForTrophy(postItem.post_id);
    setSelectedPostTrophyAwards(userAwardedTrophies);
    setShowTrophyModal(true);
  };

  const [showComments, setShowComments] = useState(false);
  const [showCritiques, setShowCritiques] = useState(false);

  const handleToggleComments = () => {
    if (showComments) {
      // If already open, close it
      setShowComments(false);
    } else {
      // Open comments and close critiques
      setShowComments(true);
      setShowCritiques(false);
    }
  };

  const handleToggleCritiques = () => {
    if (showCritiques) {
      // If already open, close it
      setShowCritiques(false);
    } else {
      // Open critiques and close comments
      setShowCritiques(true);
      setShowComments(false);
    }
  };

  return (
    <>
      <div
        key={postItem.post_id}
        className="card bg-base-200 border border-base-300 rounded-xl shadow-sm"
      >
        {/* Post Header - Instagram Style */}
        <PostHeader postItem={postItem} />

        {/* Media Content */}
        {postItem.post_type === "image" && postItem.image_url && (
          <div 
            className="w-full bg-black flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => setActivePost(postItem)}
          >
            <img
              src={postItem.image_url}
              alt={postItem.description}
              className="w-full h-auto max-h-[600px] object-contain"
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
            <NovelRenderer postItem={postItem} isDetailView={isDetailView} />
          )}

        {/* Text-only post (default type) - description shown in post body */}
        {(!postItem.post_type || postItem.post_type === "default") && postItem.description && (
          <div className="px-4 py-3">
            <p className="text-base text-base-content whitespace-pre-wrap break-words">
              {postItem.description}
            </p>
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
                onHeart={handleHeart}
                onUnheart={handleUnheart}
                isLoading={isHeartLoading}
                size="lg"
              />

              {/* Comment - Toggle comments */}
              <button
                className={`btn btn-ghost btn-sm btn-circle ${showComments ? 'text-primary' : ''}`}
                onClick={handleToggleComments}
                title={showComments ? "Hide comments" : "View comments"}
              >
                <FontAwesomeIcon
                  icon={faCommentDots}
                  className="text-xl hover:scale-110 transition-transform"
                />
              </button>

              {/* Critique - Toggle critiques */}
              <button
                className={`btn btn-ghost btn-sm btn-circle ${showCritiques ? 'text-primary' : ''}`}
                onClick={handleToggleCritiques}
                title={showCritiques ? "Hide critiques" : "View critiques"}
              >
                <FontAwesomeIcon
                  icon={faStar}
                  className="text-xl hover:scale-110 transition-transform"
                />
              </button>

              {/* Praise */}
              <button
                className={`btn btn-ghost btn-sm btn-circle relative ${isPraised ? "text-warning" : ""
                  }`}
                onClick={handlePraise}
                disabled={praiseButtonDisabled}
                title={
                  isPraised
                    ? "Already praised"
                    : "Praise this post (1 Brush Drip)"
                }
              >
                {isPraising ? (
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
                onClick={handleOpenTrophyModal}
                title="Award a trophy"
              >
                <FontAwesomeIcon
                  icon={faTrophy}
                  className="text-xl hover:scale-110 transition-transform"
                />
                {userAwardedTrophies.length > 0 && (
                  <span className="absolute -top-1 -right-1 badge badge-xs badge-warning">
                    {userAwardedTrophies.length}
                  </span>
                )}
              </button>

              {/* Share (no implementation yet) */}
              <button className="btn btn-ghost btn-sm btn-circle" title="Share post">
                <FontAwesomeIcon
                  icon={faPaperPlane}
                  className="text-xl hover:scale-110 transition-transform"
                />
              </button>
            </div>

            {/* Bookmark (no implementation yet) */}
            <button className="btn btn-ghost btn-sm btn-circle" title="Bookmark post">
              <FontAwesomeIcon
                icon={faBookmark}
                className="text-xl hover:scale-110 transition-transform"
              />
            </button>
          </div>

          {/* Likes Count */}
          <div className="mb-2 flex flex-row gap-3 items-center flex-wrap">
            {countsLoading ? (
              <>
                <div className="skeleton h-4 w-16"></div>
                <div className="skeleton h-4 w-20"></div>
                <div className="skeleton h-4 w-24"></div>
              </>
            ) : (
              <>
                {/* Heart Count - Clickable */}
                {isHeartLoading ? (
                  <div className="skeleton h-4 w-16"></div>
                ) : (
                  <button
                    onClick={handleOpenHeartList}
                    className="text-sm font-semibold text-base-content hover:underline cursor-pointer transition-all hover:scale-105"
                  >
                    {postItem.hearts_count || 0} likes
                  </button>
                )}

                {/* Praise Count - Clickable */}
                {isPraising ? (
                  <div className="skeleton h-4 w-16"></div>
                ) : (
                  praiseCount > 0 && (
                    <button
                      onClick={handleOpenPraiseList}
                      className="text-sm font-semibold text-warning hover:underline cursor-pointer transition-all hover:scale-105"
                    >
                      {praiseCount} praises
                    </button>
                  )
                )}

                {/* Trophy Count - Clickable */}
                {hasTrophies && (
                  <button
                    onClick={handleOpenTrophyList}
                    className="flex gap-2 text-sm hover:opacity-80 transition-all cursor-pointer"
                  >
                    {(trophyCounts.bronze_stroke ?? 0) > 0 && (
                      <span className="text-orange-700 font-semibold">
                        🥉 {trophyCounts.bronze_stroke}
                      </span>
                    )}
                    {(trophyCounts.golden_bristle ?? 0) > 0 && (
                      <span className="text-yellow-600 font-semibold">
                        🥈 {trophyCounts.golden_bristle}
                      </span>
                    )}
                    {(trophyCounts.diamond_canvas ?? 0) > 0 && (
                      <span className="text-blue-600 font-semibold">
                        🥇 {trophyCounts.diamond_canvas}
                      </span>
                    )}
                  </button>
                )}

                {/* Comment Count - Clickable (same as comment icon) */}
                {(postItem.comment_count || 0) > 0 && (
                  <button
                    onClick={handleToggleComments}
                    className="text-sm font-semibold text-base-content hover:underline cursor-pointer transition-all hover:scale-105"
                  >
                    {postItem.comment_count || 0} {postItem.comment_count === 1 ? 'comment' : 'comments'}
                  </button>
                )}
              </>
            )}

            {/* Time Posted */}
            <p className="text-xs text-base-content/50 uppercase">
              {new Date(postItem.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          {/* Description - Below likes/date, above Comments (only for non-default posts) */}
          {postItem.description && 
           postItem.post_type && 
           postItem.post_type !== "default" && (
            <div className="mb-3">
              <p className="text-sm text-base-content">
                <span className="font-semibold">
                  {postItem.author_username}
                </span>{" "}
                {postItem.description}
              </p>
            </div>
          )}

          {/* Comment Section - Toggleable, fetches when shown */}
          {showComments && (
            <DetailedCommentSection
              postItem={postItem}
              highlightedItemId={highlightedItemId}
              enableInitialFetch={true}
            />
          )}

          {/* Critique Section - Toggleable, always available */}
          {showCritiques && (
            <CritiqueSection postId={postItem.post_id} highlightedItemId={highlightedItemId} />
          )}
        </div>
      </div>

      {/* Praise List Modal */}
      {showPraiseListModal && selectedPostForPraiseList === postItem.post_id && (
        <PraiseListModal
          isOpen={showPraiseListModal}
          onClose={handleClosePraiseList}
          postId={postItem.post_id}
        />
      )}

      {/* Trophy List Modal */}
      {showTrophyListModal && selectedPostForTrophyList === postItem.post_id && (
        <TrophyListModal
          isOpen={showTrophyListModal}
          onClose={handleCloseTrophyList}
          postId={postItem.post_id}
        />
      )}

      {/* Heart List Modal */}
      {showHeartListModal && selectedPostForHeartList === postItem.post_id && (
        <HeartListModal
          isOpen={showHeartListModal}
          onClose={handleCloseHeartList}
          postId={postItem.post_id}
        />
      )}
    </>
  );
}
