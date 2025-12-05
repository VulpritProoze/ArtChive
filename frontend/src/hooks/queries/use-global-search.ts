/**
 * React Query hooks for global search functionality
 */
import { useQuery } from '@tanstack/react-query';
import { searchService, type SearchFilters, type SearchHistoryResponse } from '@services/search.service';

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
 * Hook for searching users only
 */
export const useSearchUsers = (
  query: string,
  filters: Omit<SearchFilters, 'type'> = {},
  options: { enabled?: boolean } = {}
) => {
  return useQuery({
    queryKey: ['search-users', query, filters],
    queryFn: () => searchService.searchUsers(query, filters),
    enabled: options.enabled !== false && query.length >= 2,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Hook for searching posts only
 */
export const useSearchPosts = (
  query: string,
  filters: Omit<SearchFilters, 'type'> = {},
  options: { enabled?: boolean } = {}
) => {
  return useQuery({
    queryKey: ['search-posts', query, filters],
    queryFn: () => searchService.searchPosts(query, filters),
    enabled: options.enabled !== false && query.length >= 2,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Hook for searching collectives only
 */
export const useSearchCollectives = (
  query: string,
  filters: Omit<SearchFilters, 'type'> = {},
  options: { enabled?: boolean } = {}
) => {
  return useQuery({
    queryKey: ['search-collectives', query, filters],
    queryFn: () => searchService.searchCollectives(query, filters),
    enabled: options.enabled !== false && query.length >= 2,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Hook for searching galleries only
 */
export const useSearchGalleries = (
  query: string,
  filters: Omit<SearchFilters, 'type'> = {},
  options: { enabled?: boolean } = {}
) => {
  return useQuery({
    queryKey: ['search-galleries', query, filters],
    queryFn: () => searchService.searchGalleries(query, filters),
    enabled: options.enabled !== false && query.length >= 2,
    staleTime: 2 * 60 * 1000,
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
  return useQuery<SearchHistoryResponse>({
    queryKey: ['search-history', limit, searchType],
    queryFn: () => searchService.getSearchHistory(limit, searchType),
    enabled: options.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook for getting user's recent search history (5 most recent, no duplicates)
 */
export const useRecentSearchHistory = (
  options: { enabled?: boolean } = {}
) => {
  return useQuery<SearchHistoryResponse>({
    queryKey: ['recent-search-history'],
    queryFn: () => searchService.getRecentSearchHistory(),
    enabled: options.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

