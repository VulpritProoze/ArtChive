import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@context/auth-context';
import {
  PostFormModal,
  CommentFormModal,
} from '@components/common/posts-feature/modal';
import { InfiniteScrolling } from '@components/common';
import { PostCard } from '@components/common/posts-feature';
import { MainLayout } from '@components/common/layout';
import { SkeletonPostCard } from '@components/common/skeleton';
import { usePosts } from '@hooks/queries/use-posts';
import { usePostsMeta } from '@hooks/queries/use-post-meta';
import { useUserProfile } from '@hooks/queries/use-user-profile';
import { usePostUI } from '@context/post-ui-context';

const Timeline: React.FC = () => {
  const { username: usernameParam } = useParams<{ username: string }>();
  // Strip @ symbol if present (React Router includes it in the param)
  const username = usernameParam?.startsWith('@') ? usernameParam.substring(1) : usernameParam;
  const navigate = useNavigate();
  const { user: currentUser } = useAuth(); // For comparison only
  const { showCommentForm, showPostForm, setShowPostForm } = usePostUI();

  // Early return if no username (invalid route)
  if (!username) {
    return (
      <MainLayout showRightSidebar={false}>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <h1 className="text-2xl font-bold text-error">Invalid Profile URL</h1>
          <p className="text-base-content/70">Please check the URL and try again.</p>
          <button
            onClick={() => navigate('/home')}
            className="btn btn-primary"
          >
            Go to Home
          </button>
        </div>
      </MainLayout>
    );
  }

  // Fetch profile data by username
  const {
    data: profileUser,
    isLoading: profileLoading,
    isError: profileError,
  } = useUserProfile(username);

  // Determine if viewing own profile
  const isOwnProfile = currentUser?.username === username;

  const observerTarget = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'works' | 'avatar' | 'collectives'>('timeline');

  // Fetch posts using user ID from profile data
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = usePosts({
    userId: profileUser?.id,
    enabled: Boolean(profileUser?.id),
  });

  const postIds = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page =>
      page.results.map(p => p.post_id)
    );
  }, [data]);

  const {
    data: metaData,
    isLoading: metaLoading
  } = usePostsMeta(postIds, postIds.length > 0);

  const enrichedPosts = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page =>
      page.results.map(post => ({
        ...post,
        ...(metaData?.[post.post_id] || {
          hearts_count: 0,
          praise_count: 0,
          trophy_count: 0,
          comment_count: 0,
          user_trophies: [],
          trophy_breakdown: {},
          is_hearted: false,
          is_praised: false,
        }),
        trophy_counts_by_type: metaData?.[post.post_id]?.trophy_breakdown || {},
        user_awarded_trophies: metaData?.[post.post_id]?.user_trophies || [],
        // Map is_hearted/is_praised from meta to Post interface fields
        // Always default to false if meta data is not available
        is_hearted_by_user: metaData?.[post.post_id]?.is_hearted ?? false,
        is_praised_by_user: metaData?.[post.post_id]?.is_praised ?? false,
      }))
    );
  }, [data, metaData]);

  const showCountsLoading = metaLoading && !metaData;
  const posts = enrichedPosts;
  const totalPosts = data?.pages[0]?.count || 0;

  useEffect(() => {
    const currentObserverTarget = observerTarget.current;
    if (!currentObserverTarget) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage && !isLoading) {
          fetchNextPage();
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(currentObserverTarget);

    return () => {
      observer.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isLoading]);

  const tabs = [
    { id: 'timeline', label: 'Timeline', icon: '📝' },
    { id: 'works', label: 'Works', icon: '🎨' },
    { id: 'avatar', label: 'Avatar', icon: '👤' },
    { id: 'collectives', label: 'Collectives', icon: '👥' },
  ] as const;

  // Handle profile loading state with skeleton
  if (profileLoading) {
    return (
      <MainLayout showRightSidebar={false}>
        <div className="mb-6">
          <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-2xl p-8 shadow-lg border border-base-300">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6">
              {/* Profile Picture Skeleton */}
              <div className="avatar">
                <div className="w-32 h-32 rounded-full bg-base-300 animate-pulse"></div>
              </div>

              <div className="flex-1 text-center lg:text-left w-full">
                {/* Name and Username Skeleton */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="h-8 w-48 bg-base-300 rounded-lg animate-pulse mb-2 mx-auto lg:mx-0"></div>
                    <div className="h-5 w-32 bg-base-300 rounded-lg animate-pulse mx-auto lg:mx-0"></div>
                  </div>
                  <div className="flex flex-wrap justify-center lg:justify-end gap-2">
                    <div className="h-9 w-24 bg-base-300 rounded-lg animate-pulse"></div>
                    <div className="h-9 w-24 bg-base-300 rounded-lg animate-pulse"></div>
                  </div>
                </div>

                {/* Artist Types Skeleton */}
                <div className="mb-4 max-w-2xl">
                  <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                    <div className="h-8 w-20 bg-base-300 rounded-full animate-pulse"></div>
                    <div className="h-8 w-24 bg-base-300 rounded-full animate-pulse"></div>
                    <div className="h-8 w-16 bg-base-300 rounded-full animate-pulse"></div>
                  </div>
                </div>

                {/* Stats Skeleton */}
                <div className="flex justify-center lg:justify-start gap-6 lg:gap-8">
                  <div className="text-center">
                    <div className="h-8 w-12 bg-base-300 rounded-lg animate-pulse mb-1 mx-auto"></div>
                    <div className="h-4 w-12 bg-base-300 rounded animate-pulse mx-auto"></div>
                  </div>
                  <div className="text-center">
                    <div className="h-8 w-12 bg-base-300 rounded-lg animate-pulse mb-1 mx-auto"></div>
                    <div className="h-4 w-16 bg-base-300 rounded animate-pulse mx-auto"></div>
                  </div>
                  <div className="text-center">
                    <div className="h-8 w-12 bg-base-300 rounded-lg animate-pulse mb-1 mx-auto"></div>
                    <div className="h-4 w-16 bg-base-300 rounded animate-pulse mx-auto"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="mb-6">
          <div className="bg-base-200/50 rounded-xl p-2">
            <div className="flex flex-wrap gap-2">
              <div className="h-10 w-24 bg-base-300 rounded-lg animate-pulse"></div>
              <div className="h-10 w-20 bg-base-300 rounded-lg animate-pulse"></div>
              <div className="h-10 w-20 bg-base-300 rounded-lg animate-pulse"></div>
              <div className="h-10 w-28 bg-base-300 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Posts Skeleton */}
        <div className="mb-12">
          <SkeletonPostCard
            count={3}
            containerClassName="flex flex-col gap-6 max-w-3xl mx-auto"
          />
        </div>
      </MainLayout>
    );
  }

  // Handle profile error (user not found)
  if (profileError || !profileUser) {
    return (
      <MainLayout showRightSidebar={false}>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <h1 className="text-2xl font-bold text-error">User Not Found</h1>
          <p className="text-base-content/70">
            The user "{username}" does not exist.
          </p>
          <button
            onClick={() => navigate('/home')}
            className="btn btn-primary"
          >
            Go to Home
          </button>
        </div>
      </MainLayout>
    );
  }

  // Handle posts error
  if (isError) {
    return (
      <MainLayout showRightSidebar={false}>
        <div className="text-center py-12 text-error">
          Error loading posts: {error?.message}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showRightSidebar={false}>
      {showPostForm && <PostFormModal user_id={currentUser?.id} />}
      {showCommentForm && <CommentFormModal />}

      <div className="mb-6">
        <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-2xl p-8 shadow-lg border border-base-300">
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6">
            <div className="relative group">
              <div className="avatar">
                <div className="w-32 h-32 rounded-full ring ring-primary ring-offset-base-100 ring-offset-4 shadow-xl group-hover:ring-secondary transition-all duration-300">
                  <img
                    src={profileUser?.profile_picture || '/static_img/default-pic-min.jpg'}
                    alt="profile avatar"
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="absolute bottom-2 right-2 w-4 h-4 bg-success rounded-full border-2 border-base-100" />
            </div>

            <div className="flex-1 text-center lg:text-left">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-3">
                <div>
                  <h2 className="text-3xl font-bold text-base-content mb-1">
                    {profileUser?.fullname || `@${profileUser?.username}` || 'User'}
                  </h2>
                  <p className="text-base-content/60 font-medium">@{profileUser?.username || 'username'}</p>
                </div>

                <div className="flex flex-wrap justify-center lg:justify-end gap-2">
                  {isOwnProfile && (
                    <>
                      <Link to="/profile/me" className="btn btn-sm btn-outline gap-2">
                        Edit Profile
                      </Link>
                      <button
                        className="btn btn-sm btn-primary gap-2"
                        onClick={() => setShowPostForm(true)}
                      >
                        Create Post
                      </button>
                    </>
                  )}
                  <button className="btn btn-sm btn-outline gap-2">Share</button>
                </div>
              </div>

              {profileUser?.artist_types && profileUser.artist_types.length > 0 ? (
                <div className="mb-4 max-w-2xl">
                  <div className="flex flex-wrap gap-2">
                    {profileUser.artist_types.map((type, index) => (
                      <span
                        key={index}
                        className="badge badge-primary badge-lg px-4 py-2 text-sm font-semibold shadow-md"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-base-content/70 text-sm lg:text-base mb-4 max-w-2xl">
                  No artist types selected
                </p>
              )}

              <div className="flex justify-center lg:justify-start gap-6 lg:gap-8">
                <div className="text-center">
                  <h4 className="text-2xl font-bold text-base-content">{posts.length}</h4>
                  <p className="text-base-content/60 text-sm">Posts</p>
                </div>
                <div className="text-center">
                  <h4 className="text-2xl font-bold text-base-content">0</h4>
                  <p className="text-base-content/60 text-sm">Followers</p>
                </div>
                <div className="text-center">
                  <h4 className="text-2xl font-bold text-base-content">0</h4>
                  <p className="text-base-content/60 text-sm">Following</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="bg-base-200/50 rounded-xl p-2">
          <nav className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${activeTab === tab.id
                  ? 'bg-primary text-primary-content shadow-md scale-[1.02]'
                  : 'hover:bg-base-300 text-base-content'
                  }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="mb-12">
        {activeTab === 'timeline' && (
          <>
            {isLoading && posts.length === 0 && (
              <SkeletonPostCard
                count={3}
                containerClassName="flex flex-col gap-6 max-w-3xl mx-auto"
              />
            )}

            <div className="flex flex-col gap-6 max-w-3xl mx-auto">
              {posts.map((postItem) => (
                <PostCard
                  key={postItem.post_id}
                  postItem={{ ...postItem, novel_post: postItem.novel_post || [] }}
                  countsLoading={showCountsLoading}
                />
              ))}
            </div>

            {posts.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="text-8xl mb-4">📝</div>
                <h3 className="text-2xl font-bold text-base-content mb-2">No Posts Yet</h3>
                <p className="text-base-content/60 text-center max-w-md mb-6">
                  {isOwnProfile
                    ? 'Start sharing your amazing artwork with the community!'
                    : `${profileUser?.username || 'This user'} hasn't shared any posts yet.`}
                </p>
                {isOwnProfile && (
                  <button className="btn btn-primary gap-2" onClick={() => setShowPostForm(true)}>
                    Create Your First Post
                  </button>
                )}
              </div>
            )}

            <InfiniteScrolling
              observerTarget={observerTarget}
              isFetchingMore={isFetchingNextPage}
              hasNextPage={hasNextPage}
              totalCount={totalPosts}
              itemCount={posts.length}
            />
          </>
        )}

        {activeTab !== 'timeline' && (
          <div className="text-center py-16 text-base-content/60">
            <div className="text-6xl mb-4">🚧</div>
            <p>Coming soon...</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Timeline;


