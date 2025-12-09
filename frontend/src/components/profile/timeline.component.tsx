import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@context/auth-context';
import {
  PostFormModal,
  CommentFormModal,
  CritiqueFormModal,
  TrophySelectionModal,
} from '@components/common/posts-feature/modal';
import { InfiniteScrolling } from '@components/common';
import { PostCard } from '@components/common/posts-feature';
import { MainLayout } from '@components/common/layout';
import { SkeletonPostCard } from '@components/common/skeleton';
import { usePosts } from '@hooks/queries/use-posts';
import { usePostsMeta } from '@hooks/queries/use-post-meta';
import { useUserProfile } from '@hooks/queries/use-user-profile';
import { usePostUI } from '@context/post-ui-context';
import { extractUsernameFromUrl } from '@utils';
import AddFellowButton from '@components/fellows/add-fellow-button.component';
import FellowsListTab from '@components/fellows/fellows-list-tab.component';
import AvatarTabContent from '@components/avatar/avatar-tab-content.component';
import { useQuery } from '@tanstack/react-query';
import { userService } from '@services/user.service';
import { galleryService } from '@services/gallery.service';
import { avatarService } from '@services/avatar.service';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { formatNumber } from '@utils/format-number.util';
import { useUserCollectives } from '@hooks/queries/use-collective-data';
import '@components/avatar/avatar-no-background.css';
import AvatarRenderer from '@components/avatar/avatar-renderer.component';
import type { AvatarOptions } from '@components/avatar/avatar-options';
import { defaultAvatarOptions } from '@components/avatar/avatar-options';

const Timeline: React.FC = () => {
  const { username: usernameParam } = useParams<{ username: string }>();
  // Extract username from URL parameter (strips @ if present)
  const username = extractUsernameFromUrl(usernameParam);
  const navigate = useNavigate();
  const { user: currentUser } = useAuth(); // For comparison only
  const { showCommentForm, showPostForm, showCritiqueForm, setShowPostForm } = usePostUI();

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

  // Fetch fellows count for the profile user
  const { data: profileUserFellows } = useQuery({
    queryKey: ['user-fellows', profileUser?.id],
    queryFn: () => {
      if (!profileUser?.id) throw new Error('User ID is required');
      return userService.getUserFellows(profileUser.id);
    },
    enabled: Boolean(profileUser?.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const fellowsCount = profileUserFellows?.length || 0;

  const observerTarget = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'works' | 'avatar' | 'collectives' | 'fellows'>('timeline');
  const [otherTabsDropdownOpen, setOtherTabsDropdownOpen] = useState(false);
  const [isGalleryDropdownOpen, setIsGalleryDropdownOpen] = useState(false);
  const [hasActiveGallery, setHasActiveGallery] = useState<boolean | null>(null);
  const [isHoveringProfile, setIsHoveringProfile] = useState(false);
  const otherTabsDropdownRef = useRef<HTMLDivElement>(null);
  const galleryDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch primary avatar for hover effect
  const { data: primaryAvatarData } = useQuery({
    queryKey: ['user-primary-avatar', profileUser?.id],
    queryFn: () => {
      if (!profileUser?.id) throw new Error('User ID is required');
      return avatarService.getPrimaryAvatarByUserId(profileUser.id);
    },
    enabled: Boolean(profileUser?.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Debug logging
  React.useEffect(() => {
    if (isHoveringProfile) {
      console.log('Hovering profile, avatar data:', primaryAvatarData);
    }
  }, [isHoveringProfile, primaryAvatarData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (otherTabsDropdownRef.current && !otherTabsDropdownRef.current.contains(event.target as Node)) {
        setOtherTabsDropdownOpen(false);
      }
      if (galleryDropdownRef.current && !galleryDropdownRef.current.contains(event.target as Node)) {
        setIsGalleryDropdownOpen(false);
      }
    }

    if (otherTabsDropdownOpen || isGalleryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [otherTabsDropdownOpen, isGalleryDropdownOpen]);

  // Check if user has active gallery
  useEffect(() => {
    const checkActiveGallery = async () => {
      if (!profileUser?.id) return;
      
      try {
        const response = await galleryService.hasActiveGallery(profileUser.id);
        setHasActiveGallery(response.has_active);
      } catch (error) {
        console.error("Error checking active gallery:", error);
        setHasActiveGallery(false);
      }
    };

    checkActiveGallery();
  }, [profileUser?.id]);

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

  // Avatar tab is only visible to the owner (private feature)
  const mainTabs = (isOwnProfile 
    ? [
        { id: 'timeline' as const, label: 'Timeline', icon: '📝' },
        { id: 'works' as const, label: 'Works', icon: '🎨' },
        { id: 'avatar' as const, label: 'Avatar', icon: '👤' },
        { id: 'collectives' as const, label: 'Collectives', icon: '👥' },
      ]
    : [
        { id: 'timeline' as const, label: 'Timeline', icon: '📝' },
        { id: 'works' as const, label: 'Works', icon: '🎨' },
        { id: 'collectives' as const, label: 'Collectives', icon: '👥' },
      ]
  );

  const otherTabs = [
    { id: 'fellows', label: 'Fellows', icon: '👫' },
  ] as const;

  // Handle profile loading state with skeleton
  if (profileLoading) {
    return (
      <MainLayout showRightSidebar={false}>
        <div className="mb-6">
          <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-2xl p-8 shadow-lg border border-base-300 overflow-visible">
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
            count={1}
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
      {showCritiqueForm && <CritiqueFormModal />}
      <TrophySelectionModal />

      <div className="mb-6">
        <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-2xl p-8 shadow-lg border border-base-300 overflow-visible">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6">
            <div 
              className="relative group"
              style={{ 
                width: '128px', 
                height: '128px',
                flexShrink: 0, // Prevent layout shift
              }}
              onMouseEnter={() => {
                console.log('Mouse enter - setting hover to true');
                console.log('Primary avatar data:', primaryAvatarData);
                setIsHoveringProfile(true);
              }}
              onMouseLeave={() => {
                console.log('Mouse leave - setting hover to false');
                setIsHoveringProfile(false);
              }}
            >
              {/* Animated Avatar (behind profile picture, tilted 45 degrees, positioned top-right) */}
              {primaryAvatarData?.has_primary_avatar && primaryAvatarData.canvas_json && (
                <div 
                  className="absolute pointer-events-none transition-all duration-500 ease-out" 
                  style={{ 
                    zIndex: 0,
                    width: '128px',
                    height: '128px',
                    top: isHoveringProfile ? '-30px' : '-10px',
                    right: isHoveringProfile ? '-100px' : '-20px',
                    transform: `rotate(45deg) scale(${isHoveringProfile ? 1 : 0.8})`,
                    transformOrigin: 'center',
                    opacity: isHoveringProfile ? 1 : 0,
                    pointerEvents: 'none',
                  }}
                >
                  {(() => {
                    // Extract avatarOptions from canvas_json and merge with defaults to ensure all fields exist
                    const canvasJson = primaryAvatarData.canvas_json;
                    const avatarOptions: AvatarOptions = {
                      ...defaultAvatarOptions,
                      ...(canvasJson?.avatarOptions || {}),
                    };
                    
                    // Remove background for hover display
                    const avatarOptionsNoBg: AvatarOptions = {
                      ...avatarOptions,
                      background: 'transparent',
                    };
                    
                    // Get animation from server response (already extracted from canvas_json)
                    const animation = primaryAvatarData.animation || 'none';
                    
                    return (
                      <div 
                        className="relative w-full"
                        style={{
                          width: '128px',
                          height: '128px',
                        }}
                      >
                        <div 
                          className="absolute inset-0 flex items-center justify-center transition-transform duration-300"
                          style={{
                            aspectRatio: '1 / 1',
                          }}
                        >
                          <AvatarRenderer
                            options={avatarOptionsNoBg}
                            size={512}
                            animation={animation as any}
                            className="w-full h-full rounded-xl"
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              
              {/* Profile Picture (on top, stays fully visible) */}
              <div 
                className="avatar relative" 
                style={{ 
                  zIndex: 10,
                }}
              >
                <div className="w-32 h-32 rounded-full ring ring-primary ring-offset-base-100 ring-offset-4 shadow-xl group-hover:ring-secondary transition-all duration-300 bg-base-100">
                  <img
                    src={profileUser?.profile_picture || '/static_img/default-pic-min.jpg'}
                    alt="profile avatar"
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
              <div className="absolute bottom-2 right-2 w-4 h-4 bg-success rounded-full border-2 border-base-100" style={{ zIndex: 20 }} />
            </div>

            <div className="flex-1 text-center lg:text-left">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-3">
                <div>
                  <h2 className="text-3xl font-bold text-base-content mb-1">
                    {profileUser?.fullname || `@${profileUser?.username}` || 'User'}
                  </h2>
                  <p className="text-base-content/60 font-medium">@{profileUser?.username || 'username'}</p>
                </div>

                <div className="flex flex-wrap justify-center lg:justify-end gap-2 items-center">
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
                  {!isOwnProfile && <AddFellowButton profileUser={profileUser} />}
                  <button className="btn btn-sm btn-outline gap-2">Share</button>
                  
                  {/* Three Dots Dropdown */}
                  <div className="relative" ref={galleryDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsGalleryDropdownOpen(!isGalleryDropdownOpen)}
                      className="btn btn-circle btn-ghost btn-sm"
                      aria-label="More options"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="6" cy="12" r="1.5" />
                        <circle cx="18" cy="12" r="1.5" />
                      </svg>
                    </button>
                    {isGalleryDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-base-100 rounded-lg shadow-xl border border-base-300 z-50 overflow-hidden">
                        <div className="p-2">
                          {profileUser?.id && (
                            <div
                              title={
                                hasActiveGallery === false
                                  ? isOwnProfile
                                    ? "You don't have an active gallery yet. Publish a gallery to view it here."
                                    : `${profileUser?.username || 'This user'} doesn't have an active gallery yet.`
                                  : undefined
                              }
                            >
                              {hasActiveGallery ? (
                                <Link
                                  to={`/gallery/${profileUser.id}`}
                                  className="btn btn-outline btn-sm w-full justify-start gap-3 normal-case"
                                  onClick={() => setIsGalleryDropdownOpen(false)}
                                >
                                  <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                  <span>View Published Gallery</span>
                                </Link>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm w-full justify-start gap-3 normal-case"
                                  disabled
                                  style={{ cursor: 'not-allowed' }}
                                >
                                  <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                  <span>View Published Gallery</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
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
                <button
                  onClick={() => setActiveTab('fellows')}
                  className="text-center hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <h4 className="text-2xl font-bold text-base-content">{fellowsCount ?? "-"}</h4>
                  <p className="text-base-content/60 text-sm">Fellows</p>
                </button>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {(() => {
                      const reputation = profileUser?.reputation ?? 0;
                      const isPositive = reputation > 0;
                      const isNegative = reputation < 0;
                      return (
                        <>
                          {isPositive ? (
                            <ArrowUp className="w-5 h-5 text-success flex-shrink-0" />
                          ) : isNegative ? (
                            <ArrowDown className="w-5 h-5 text-error flex-shrink-0" />
                          ) : null}
                          <h4
                            className={`text-2xl font-bold ${
                              isPositive
                                ? 'text-success'
                                : isNegative
                                ? 'text-error'
                                : 'text-base-content'
                            }`}
                          >
                            {formatNumber(reputation)}
                          </h4>
                        </>
                      );
                    })()}
                  </div>
                  <p className="text-base-content/60 text-sm">Reputation</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="bg-base-200/50 rounded-xl p-2">
          <nav className="flex flex-wrap gap-2 items-center">
            {mainTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'timeline' | 'works' | 'avatar' | 'collectives' | 'fellows')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${activeTab === tab.id
                  ? 'bg-primary text-primary-content shadow-md scale-[1.02]'
                  : 'hover:bg-base-300 text-base-content'
                  }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
            {/* Other Tabs Dropdown */}
            <div className="dropdown dropdown-end" ref={otherTabsDropdownRef}>
              <button
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  otherTabs.some(tab => activeTab === tab.id)
                    ? 'bg-primary text-primary-content shadow-md scale-[1.02]'
                    : 'hover:bg-base-300 text-base-content'
                }`}
                onClick={() => setOtherTabsDropdownOpen(!otherTabsDropdownOpen)}
              >
                <span>More</span>
                <svg
                  className={`w-4 h-4 transition-transform ${otherTabsDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {otherTabsDropdownOpen && (
                <ul className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-48 border border-base-300 z-50 mt-2">
                  {otherTabs.map((tab) => (
                    <li key={tab.id}>
                      <button
                        onClick={() => {
                          setActiveTab(tab.id);
                          setOtherTabsDropdownOpen(false);
                        }}
                        className={`flex items-center gap-2 ${activeTab === tab.id ? 'bg-primary text-primary-content' : ''}`}
                      >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </nav>
        </div>
      </div>

      <div className="mb-12">
        {activeTab === 'timeline' && (
          <>
            {isLoading && posts.length === 0 && (
              <SkeletonPostCard
                count={1}
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

        {activeTab === 'fellows' && (
          <FellowsListTab 
            profileUserId={profileUser?.id}
            isOwnProfile={isOwnProfile}
          />
        )}

        {activeTab === 'avatar' && (
          <AvatarTabContent 
            userId={profileUser?.id}
            isOwnProfile={isOwnProfile}
          />
        )}

        {activeTab === 'collectives' && (
          <UserCollectivesTab userId={profileUser?.id} />
        )}

        {activeTab !== 'timeline' && activeTab !== 'fellows' && activeTab !== 'avatar' && activeTab !== 'collectives' && (
          <div className="text-center py-16 text-base-content/60">
            <div className="text-6xl mb-4">🚧</div>
            <p>Coming soon...</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

function UserCollectivesTab({ userId }: { userId?: number }) {
  const { data: collectives, isLoading, isError } = useUserCollectives(
    userId,
    { enabled: Boolean(userId) } // Only fetch when userId is available
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="loading loading-spinner loading-lg"></div>
        <p className="mt-4 text-base-content/60">Loading collectives...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="text-6xl mb-4">⚠️</div>
        <p className="text-base-content/60">Failed to load collectives</p>
      </div>
    );
  }

  if (!collectives || collectives.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="text-6xl mb-4">👥</div>
        <h3 className="text-2xl font-bold text-base-content mb-2">No Collectives</h3>
        <p className="text-base-content/60 text-center max-w-md">
          This user is not a member of any collectives yet.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {collectives.map((collective) => (
        <div
          key={collective.collective_id}
          className="card bg-base-200 shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="card-body p-4">
            <div className="flex items-center gap-3 mb-3">
              {collective.picture && (
                <div className="avatar">
                  <div className="w-12 h-12 rounded-full ring ring-primary ring-offset-base-200 ring-offset-2">
                    <img src={collective.picture} alt={collective.title} />
                  </div>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base truncate">{collective.title}</h3>
                {collective.collective_role === 'admin' && (
                  <span className="badge badge-warning badge-sm mt-1">Admin</span>
                )}
              </div>
            </div>
            {collective.description && (
              <p className="text-sm text-base-content/70 line-clamp-2 mb-2">
                {collective.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-xs text-base-content/60">
              <span>👥 {collective.member_count} members</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Timeline;