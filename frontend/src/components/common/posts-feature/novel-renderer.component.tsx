import type { NovelPost, Post } from "@types";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faBookOpen, faClock } from "@fortawesome/free-solid-svg-icons";

interface PostItem extends Post {
  novel_post: NovelPost[];
}

interface NovelRendererProps {
  postItem: PostItem;
  isDetailView?: boolean;
}

export default function NovelRenderer({ postItem, isDetailView = false }: NovelRendererProps) {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isChapterDropdownOpen, setIsChapterDropdownOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Reset to first chapter when post changes
  useEffect(() => {
    setCurrentChapterIndex(0);
    setScrollProgress(0);
  }, [postItem.post_id]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentChapterIndex, postItem.novel_post.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsChapterDropdownOpen(false);
      }
    };

    if (isChapterDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isChapterDropdownOpen]);

  // Track scroll progress
  useEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = contentElement;
      const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
      setScrollProgress(Math.min(100, Math.max(0, progress)));
    };

    contentElement.addEventListener('scroll', handleScroll);
    return () => contentElement.removeEventListener('scroll', handleScroll);
  }, [currentChapterIndex]);

  const handlePrevious = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(currentChapterIndex - 1);
      setScrollProgress(0);
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    }
  };

  const handleNext = () => {
    if (currentChapterIndex < postItem.novel_post.length - 1) {
      setCurrentChapterIndex(currentChapterIndex + 1);
      setScrollProgress(0);
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    }
  };

  const handleChapterSelect = (index: number) => {
    setCurrentChapterIndex(index);
    setScrollProgress(0);
    setIsChapterDropdownOpen(false);
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  };

  const currentChapter = postItem.novel_post[currentChapterIndex];
  
  // Calculate word count and reading time
  const wordCount = currentChapter?.content
    ? currentChapter.content.trim().split(/\s+/).filter(word => word.length > 0).length
    : 0;
  const readingTime = Math.ceil(wordCount / 200); // Average reading speed: 200 words per minute

  return (
    <div className="w-full bg-base-100 flex flex-col">
      {/* Chapter Navigation - Show in both feed and detail view */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-base-300 bg-base-200/50">
        <button
          className="btn btn-ghost btn-sm gap-2"
          disabled={currentChapterIndex === 0}
          onClick={handlePrevious}
          title="Previous Chapter (←)"
        >
          <FontAwesomeIcon icon={faChevronLeft} className="w-3 h-3" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Chapter Selector Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            className="btn btn-ghost btn-sm gap-2 min-w-[140px]"
            onClick={() => setIsChapterDropdownOpen(!isChapterDropdownOpen)}
            title="Select Chapter"
          >
            <FontAwesomeIcon icon={faBookOpen} className="w-3 h-3" />
            <span className="text-sm font-medium">
              Chapter {currentChapterIndex + 1} / {postItem.novel_post.length}
            </span>
          </button>
          
          {isChapterDropdownOpen && (
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-56 bg-base-100 rounded-lg shadow-xl border border-base-300 z-50 max-h-64 overflow-y-auto">
              <div className="p-2">
                {postItem.novel_post.map((chapter, index) => (
                  <button
                    key={index}
                    onClick={() => handleChapterSelect(index)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      index === currentChapterIndex
                        ? 'bg-primary text-primary-content font-semibold'
                        : 'hover:bg-base-200 text-base-content'
                    }`}
                  >
                    Chapter {index + 1}
                    {chapter.chapter && `: ${chapter.chapter}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          className="btn btn-ghost btn-sm gap-2"
          disabled={currentChapterIndex >= postItem.novel_post.length - 1}
          onClick={handleNext}
          title="Next Chapter (→)"
        >
          <span className="hidden sm:inline">Next</span>
          <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3" />
        </button>
      </div>

      {/* Reading Stats - Show in both feed and detail view */}
      {currentChapter?.content && (
        <div className="flex items-center justify-between px-4 py-2 bg-base-200/30 border-b border-base-300 text-xs text-base-content/70">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <FontAwesomeIcon icon={faBookOpen} className="w-3 h-3" />
              {wordCount.toLocaleString()} words
            </span>
            <span className="flex items-center gap-1">
              <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
              {readingTime} min read
            </span>
          </div>
          {/* Scroll Progress Indicator - Only show in feed view (no scrolling in detail) */}
          {!isDetailView && (
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-base-300 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${scrollProgress}%` }}
                />
              </div>
              <span className="text-xs w-10 text-right">{Math.round(scrollProgress)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Chapter Content */}
      <div className={`relative ${isDetailView ? 'w-full' : 'h-[500px] sm:h-96'}`}>
        {/* Content container - no overflow-y in feed (shows what fits), full height in detail */}
        <div
          ref={contentRef}
          className={`${isDetailView ? 'relative w-full' : 'absolute inset-0'} overflow-x-hidden overflow-y-hidden p-6 sm:p-8 bg-gradient-to-b from-base-100 via-base-200/50 to-base-200`}
        >
          <div className="max-w-3xl mx-auto">
            {currentChapter?.content ? (
              <div
                className="prose prose-lg max-w-none"
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  lineHeight: '1.8',
                  fontSize: '1.125rem',
                  color: 'var(--fallback-bc, oklch(var(--bc)))',
                }}
              >
                <div className="whitespace-pre-wrap break-words">
                  {currentChapter.content.split('\n').map((paragraph, index) => {
                    if (paragraph.trim() === '') {
                      return <div key={index} className="h-4" />;
                    }
                    return (
                      <p key={index} className="mb-4 leading-relaxed">
                        {paragraph}
                      </p>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-base-content/70">No content available</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom fade overlay with improved button - Only show in feed view */}
        {!isDetailView && (
          <div className="absolute bottom-0 left-0 right-0 h-32 flex justify-center items-end pb-4 bg-gradient-to-t from-base-100 via-base-100/80 to-transparent pointer-events-none">
            <button
              className="btn btn-primary btn-sm gap-2 shadow-lg pointer-events-auto hover:scale-105 transition-transform"
              onClick={() => navigate(`/post/${postItem.post_id}`)}
            >
              <FontAwesomeIcon icon={faBookOpen} className="w-4 h-4" />
              Continue Reading
            </button>
          </div>
        )}
      </div>
    </div>
  );
}