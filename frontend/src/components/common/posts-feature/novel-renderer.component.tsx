import type { NovelPost, Post } from "@types";
import { useState, useEffect } from "react";
import { usePostContext } from "@context/post-context";

interface PostItem extends Post {
  novel_post: NovelPost[];
}

export default function NovelRenderer({ postItem }: { postItem: PostItem }) {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);

  const { setActivePost } = usePostContext()

  // Reset to first chapter when post changes
  useEffect(() => {
    setCurrentChapterIndex(0);
  }, [postItem.post_id]);

  const handlePrevious = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(currentChapterIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentChapterIndex < postItem.novel_post.length - 1) {
      setCurrentChapterIndex(currentChapterIndex + 1);
    }
  };

  const currentChapter = postItem.novel_post[currentChapterIndex];

  return (
    <div className="w-full bg-base-100 flex flex-col">
      {/* Chapter Navigation */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-base-300">
        <button
          className="btn btn-ghost btn-sm"
          disabled={currentChapterIndex === 0}
          onClick={handlePrevious}
        >
          Previous
        </button>
        <span className="text-sm font-medium text-base-content">
          Chapter {currentChapterIndex + 1} / {postItem.novel_post.length}
        </span>
        <button
          className="btn btn-ghost btn-sm"
          disabled={currentChapterIndex >= postItem.novel_post.length - 1}
          onClick={handleNext}
        >
          Next
        </button>
      </div>

      {/* Chapter Content */}
      <div className="relative h-80">
        {/* Content container with fading effect */}
        <div className="absolute inset-0 overflow-hidden p-4 bg-base-200">
          <div className="h-full pr-2 prose max-w-none">
            {currentChapter?.content ? (
              <p className="text-base-content whitespace-pre-wrap break-words">
                {currentChapter.content}
              </p>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-base-content/70">No content available</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Bottom fade overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-32 flex justify-center items-end pb-0.5 bg-gradient-to-t from-base-100 to-transparent">
          <button className="btn btn-xs btn-primary text-xs" onClick={() => setActivePost(postItem)}>See more in full tab view.</button>
        </div>
      </div>
    </div>
  );
}