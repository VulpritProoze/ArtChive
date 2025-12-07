/**
 * React Query hooks for global search functionality
 */
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { searchService, type SearchFilters, type SearchHistoryResponse } from '@services/search.service';
import { useUserId } from '@context/auth-context';

/**
 * Hook for unified global search (all types)
 * Returns full search results with pagination support
 */
export const useGlobalSearch = (
  query: string,
  filters: SearchFilters = {},
  options: { enabled?: boolean } = {}
) => {
  return useQuery({
    queryKey: ['global-search', query, filters],
    queryFn: () => searchService.searchAll(query, filters),
    enabled: options.enabled !== false && query.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Hook for global search preview (page 1 only, limited results)
 * Used for dropdown preview in MainLayout
 */
export const useGlobalSearchPreview = (
  query: string,
  filters: SearchFilters = {},
  options: { enabled?: boolean } = {}
) => {
  return useQuery({
    queryKey: ['global-search-preview', query, filters],
    queryFn: () => searchService.searchAll(query, { ...filters, limit: 5 }), // Limit to 5 per type for preview
    enabled: options.enabled !== false && query.length >= 2,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/**
 * Hook for searching users only (with pagination)
 */
export const useSearchUsers = (
  query: string,
  filters: Omit<SearchFilters, 'type'> = {},
  options: { enabled?: boolean } = {}
) => {
  return useInfiniteQuery({
    queryKey: ['search-users', query, filters],
    queryFn: ({ pageParam = 1 }) => searchService.searchUsers(query, { ...filters, page: pageParam, page_size: filters.page_size || 10 }),
    getNextPageParam: (lastPage) => {
      if (lastPage.next) {
        try {
          // Handle both absolute and relative URLs
          const url = lastPage.next.startsWith('http') 
            ? new URL(lastPage.next)
            : new URL(lastPage.next, window.location.origin);
          const page = url.searchParams.get('page');
          return page ? parseInt(page, 10) : undefined;
        } catch {
          // Fallback: manually parse query string
          const match = lastPage.next.match(/[?&]page=(\d+)/);
          return match ? parseInt(match[1], 10) : undefined;
        }
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: options.enabled !== false && query.length >= 2,
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new data
  });
};

/**
 * Hook for searching posts only (with pagination)
 */
export const useSearchPosts = (
  query: string,
  filters: Omit<SearchFilters, 'type'> = {},
  options: { enabled?: boolean } = {}
) => {
  return useInfiniteQuery({
    queryKey: ['search-posts', query, filters],
    queryFn: ({ pageParam = 1 }) => searchService.searchPosts(query, { ...filters, page: pageParam, page_size: filters.page_size || 10 }),
    getNextPageParam: (lastPage) => {
      if (lastPage.next) {
        try {
          // Handle both absolute and relative URLs
          const url = lastPage.next.startsWith('http') 
            ? new URL(lastPage.next)
            : new URL(lastPage.next, window.location.origin);
          const page = url.searchParams.get('page');
          return page ? parseInt(page, 10) : undefined;
        } catch {
          // Fallback: manually parse query string
          const match = lastPage.next.match(/[?&]page=(\d+)/);
          return match ? parseInt(match[1], 10) : undefined;
        }
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: options.enabled !== false && query.length >= 2,
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new data
  });
};

/**
 * Hook for searching collectives only (with pagination)
 */
export const useSearchCollectives = (
  query: string,
  filters: Omit<SearchFilters, 'type'> = {},
  options: { enabled?: boolean } = {}
) => {
  return useInfiniteQuery({
    queryKey: ['search-collectives', query, filters],
    queryFn: ({ pageParam = 1 }) => searchService.searchCollectives(query, { ...filters, page: pageParam, page_size: filters.page_size || 10 }),
    getNextPageParam: (lastPage) => {
      if (lastPage.next) {
        try {
          // Handle both absolute and relative URLs
          const url = lastPage.next.startsWith('http') 
            ? new URL(lastPage.next)
            : new URL(lastPage.next, window.location.origin);
          const page = url.searchParams.get('page');
          return page ? parseInt(page, 10) : undefined;
        } catch {
          // Fallback: manually parse query string
          const match = lastPage.next.match(/[?&]page=(\d+)/);
          return match ? parseInt(match[1], 10) : undefined;
        }
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: options.enabled !== false && query.length >= 2,
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new data
  });
};

/**
 * Hook for searching galleries only (with pagination)
 */
export const useSearchGalleries = (
  query: string,
  filters: Omit<SearchFilters, 'type'> = {},
  options: { enabled?: boolean } = {}
) => {
  return useInfiniteQuery({
    queryKey: ['search-galleries', query, filters],
    queryFn: ({ pageParam = 1 }) => searchService.searchGalleries(query, { ...filters, page: pageParam, page_size: filters.page_size || 10 }),
    getNextPageParam: (lastPage) => {
      if (lastPage.next) {
        try {
          // Handle both absolute and relative URLs
          const url = lastPage.next.startsWith('http') 
            ? new URL(lastPage.next)
            : new URL(lastPage.next, window.location.origin);
          const page = url.searchParams.get('page');
          return page ? parseInt(page, 10) : undefined;
        } catch {
          // Fallback: manually parse query string
          const match = lastPage.next.match(/[?&]page=(\d+)/);
          return match ? parseInt(match[1], 10) : undefined;
        }
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: options.enabled !== false && query.length >= 2,
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new data
  });
};

/**
 * Hook for getting user's search history
 */
export const useSearchHistory = (
  limit: number = 10,
  searchType?: string,
  options: { enabled?: boolean } = {}
) => {
  const userId = useUserId();
  return useQuery<SearchHistoryResponse>({
    queryKey: ['search-history', userId, limit, searchType],
    queryFn: () => searchService.getSearchHistory(limit, searchType),
    enabled: options.enabled !== false && Boolean(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook for getting user's recent search history (5 most recent, no duplicates)
 */
export const useRecentSearchHistory = (
  options: { enabled?: boolean } = {}
) => {
  const userId = useUserId();
  return useQuery<SearchHistoryResponse>({
    queryKey: ['recent-search-history', userId],
    queryFn: () => searchService.getRecentSearchHistory(),
    enabled: options.enabled !== false && Boolean(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

