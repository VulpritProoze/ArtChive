import { useState, useEffect } from "react";
import type { RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SkeletonPostCard } from "@components/common/skeleton";

interface InfiniteScrollingProps {
  observerTarget: RefObject<HTMLDivElement | null>;
  isFetchingMore?: boolean;
  hasNextPage?: boolean;
  totalCount?: number;
  itemCount?: number;
}

const endMessages = [
  {
    kaomoji: "(￣^￣)ゞ",
    text: "Congratulations! You've reached the end of the line!",
    subtext: "You've scrolled through {count} {posts}... time to touch some grass! 🌱"
  },
  {
    kaomoji: "( ﾟヮﾟ)",
    text: "Wow! You made it to the end!",
    subtext: "That's {count} {posts} of pure scrolling dedication! 🎉"
  },
  {
    kaomoji: "(´∀｀)♡",
    text: "You've seen everything there is to see!",
    subtext: "All {count} {posts} have been scrolled through! Time for a break? ☕"
  },
  {
    kaomoji: "ヽ(´ー｀)ノ",
    text: "End of the road, traveler!",
    subtext: "You've conquered all {count} {posts}! What's next? 🚀"
  },
  {
    kaomoji: "(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧",
    text: "That's a wrap!",
    subtext: "You've scrolled through {count} {posts}... impressive! 👏"
  },
  {
    kaomoji: "( ͡° ͜ʖ ͡°)",
    text: "No more posts to see here!",
    subtext: "You've reached the end of {count} {posts}! Go outside! 🌳"
  },
];

const InfiniteScrolling = ({
  observerTarget,
  isFetchingMore = false,
  hasNextPage = false,
  totalCount = 0,
  itemCount = 0,
}: InfiniteScrollingProps) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    if (!hasNextPage && itemCount > 0) {
      const interval = setInterval(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % endMessages.length);
      }, 10000); // 10 seconds

      return () => clearInterval(interval);
    }
  }, [hasNextPage, itemCount]);

  const currentMessage = endMessages[currentMessageIndex];
  const postCount = totalCount || itemCount;
  const postText = postCount === 1 ? 'post' : 'posts';
  
  // Split subtext to highlight the count
  const subtextParts = currentMessage.subtext.split('{count}');
  const beforeCount = subtextParts[0];
  const afterCount = subtextParts[1]?.replace('{posts}', postText) || '';

  return (
    <>
      {isFetchingMore && (
        <div className="py-4">
          <SkeletonPostCard count={3} containerClassName="space-y-4" />
        </div>
      )}

      {hasNextPage && !isFetchingMore && (
        <div
          ref={observerTarget}
          className="h-10"
          aria-label="Load more posts"
        />
      )}

      {!hasNextPage && itemCount > 0 && (
        <div className="text-center py-8 mt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentMessageIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-sm text-base-content/60 mb-2">
                {currentMessage.kaomoji}
              </p>
              <p className="text-sm text-base-content/60 mb-2">
                {currentMessage.text}
              </p>
              <p className="text-sm text-base-content/60">
                {beforeCount}
                <span className="font-bold text-primary">{postCount}</span>
                {afterCount}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </>
  );
};

export default InfiniteScrolling;