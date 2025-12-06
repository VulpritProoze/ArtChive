import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFellows, useSearchFellows } from '@hooks/queries/use-fellows';
import { useAuth } from '@context/auth-context';
import { userService } from '@services/user.service';
import FellowCard from './fellow-card.component';
import FellowsSearchBar from './fellows-search-bar.component';
import type { FellowSearchParams, UserFellow } from '@types';
import { SimpleLoadingSpinner } from '@components/loading-spinner';

interface FellowsListTabProps {
  profileUserId?: number;
  isOwnProfile?: boolean;
}

export default function FellowsListTab({ profileUserId, isOwnProfile = false }: FellowsListTabProps) {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useState<FellowSearchParams>({
    q: '',
    filter_by: 'username',
  });

  // If viewing someone else's profile, fetch their fellows
  const { data: profileUserFellows, isLoading: isLoadingProfileFellows } = useQuery<UserFellow[]>({
    queryKey: ['user-fellows', profileUserId],
    queryFn: () => {
      if (!profileUserId) throw new Error('User ID is required');
      return userService.getUserFellows(profileUserId);
    },
    enabled: !isOwnProfile && Boolean(profileUserId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // If viewing own profile, use the authenticated endpoints
  const { data: allFellows, isLoading: isLoadingFellows } = useFellows();
  const { data: searchResults, isLoading: isSearching } = useSearchFellows(searchParams);

  // Determine which data source to use
  const fellows = isOwnProfile
    ? (searchParams.q && searchParams.q.trim() ? searchResults : allFellows)
    : profileUserFellows;
  const isLoading = isOwnProfile
    ? (searchParams.q && searchParams.q.trim() ? isSearching : isLoadingFellows)
    : isLoadingProfileFellows;

  // For non-own profile, don't show search (or show a limited version)
  const showSearch = isOwnProfile;

  return (
    <div className="flex flex-col gap-6">
      {/* Search Bar - only show for own profile */}
      {showSearch && <FellowsSearchBar onSearch={setSearchParams} />}

      {/* Fellows List */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <SimpleLoadingSpinner text="Loading fellows..." />
        </div>
      ) : fellows && fellows.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fellows.map((fellow) => (
            <FellowCard
              key={fellow.id}
              fellow={fellow}
              currentUserId={isOwnProfile && currentUser ? currentUser.id : profileUserId || 0}
              showActions={isOwnProfile}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg font-bold text-base-content mb-2">
            {showSearch && searchParams.q && searchParams.q.trim()
              ? 'No Fellows Found'
              : 'No Fellows Yet'}
          </h3>
          <p className="text-sm text-base-content/60">
            {showSearch && searchParams.q && searchParams.q.trim()
              ? 'Try adjusting your search criteria.'
              : 'Start connecting with other artists!'}
          </p>
        </div>
      )}
    </div>
  );
}

