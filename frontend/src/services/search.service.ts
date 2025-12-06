/**
 * Search service for global search functionality
 */
import { search } from '@lib/api';

export interface SearchFilters {
  type?: 'all' | 'users' | 'posts' | 'collectives' | 'galleries';
  page?: number;
  page_size?: number;
  limit?: number; // Deprecated, use page_size instead
  offset?: number; // Deprecated, use page instead
  sort?: 'relevance' | 'date' | 'popularity';
  date_from?: string;
  date_to?: string;
  user_id?: number;
  collective_id?: string;
  status?: string;
  post_type?: string;
  artist_types?: string[];
}

export interface SearchResult<T> {
  count: number;
  items: T[];
}

export interface GlobalSearchResponse {
  query: string;
  results: {
    users: SearchResult<UserSearchResult>;
    posts: SearchResult<PostSearchResult>;
    collectives: SearchResult<CollectiveSearchResult>;
    galleries: SearchResult<GallerySearchResult>;
  };
  total_count: number;
}

export interface UserSearchResult {
  id: number;
  username: string;
  fullname: string;
  profile_picture: string;
  artist_types: string[];
}

export interface PostSearchResult {
  post_id: string;
  description: string;
  post_type: string;
  image_url?: string;
  author: number;
  author_username: string;
  author_profile_picture: string;
  created_at: string;
}

export interface CollectiveSearchResult {
  collective_id: string;
  title: string;
  description: string;
  picture?: string;
  member_count: number;
  created_at: string;
}

export interface GallerySearchResult {
  gallery_id: string;
  title: string;
  description: string;
  status: string;
  picture?: string;
  creator_id?: number;
  creator: number;
  creator_username: string;
  creator_profile_picture: string;
  created_at: string;
}

export interface SearchHistoryItem {
  id: number;
  query: string;
  search_type: string;
  result_count: number;
  is_successful: boolean;
  created_at: string;
}

export interface SearchHistoryResponse {
  results: SearchHistoryItem[];
  count: number;
}

class SearchService {
  /**
   * Unified search across all types
   */
  async searchAll(query: string, filters: SearchFilters = {}): Promise<GlobalSearchResponse> {
    const params = new URLSearchParams({
      q: query,
      ...(filters.type && { type: filters.type }),
      ...(filters.limit && { limit: filters.limit.toString() }),
      ...(filters.offset && { offset: filters.offset.toString() }),
      ...(filters.sort && { sort: filters.sort }),
    });

    const response = await search.get<GlobalSearchResponse>(`?${params.toString()}`);
    return response.data;
  }

  /**
   * Search users only
   */
  async searchUsers(query: string, filters: Omit<SearchFilters, 'type'> = {}): Promise<{ results: UserSearchResult[]; count: number; next: string | null; previous: string | null }> {
    const params = new URLSearchParams({
      q: query,
      ...(filters.page && { page: filters.page.toString() }),
      ...(filters.page_size && { page_size: filters.page_size.toString() }),
      // Legacy support
      ...(filters.limit && !filters.page_size && { limit: filters.limit.toString() }),
    });

    const response = await search.get<{ results: UserSearchResult[]; count: number; next: string | null; previous: string | null }>(
      `users/?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Search posts only
   */
  async searchPosts(query: string, filters: Omit<SearchFilters, 'type'> = {}): Promise<{ results: PostSearchResult[]; count: number; next: string | null; previous: string | null }> {
    const params = new URLSearchParams({
      q: query,
      ...(filters.page && { page: filters.page.toString() }),
      ...(filters.page_size && { page_size: filters.page_size.toString() }),
      // Legacy support
      ...(filters.limit && !filters.page_size && { limit: filters.limit.toString() }),
    });

    const response = await search.get<{ results: PostSearchResult[]; count: number; next: string | null; previous: string | null }>(
      `posts/?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Search collectives only
   */
  async searchCollectives(query: string, filters: Omit<SearchFilters, 'type'> = {}): Promise<{ results: CollectiveSearchResult[]; count: number; next: string | null; previous: string | null }> {
    const params = new URLSearchParams({
      q: query,
      ...(filters.page && { page: filters.page.toString() }),
      ...(filters.page_size && { page_size: filters.page_size.toString() }),
      // Legacy support
      ...(filters.limit && !filters.page_size && { limit: filters.limit.toString() }),
    });

    const response = await search.get<{ results: CollectiveSearchResult[]; count: number; next: string | null; previous: string | null }>(
      `collectives/?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Search galleries only
   */
  async searchGalleries(query: string, filters: Omit<SearchFilters, 'type'> = {}): Promise<{ results: GallerySearchResult[]; count: number; next: string | null; previous: string | null }> {
    const params = new URLSearchParams({
      q: query,
      ...(filters.page && { page: filters.page.toString() }),
      ...(filters.page_size && { page_size: filters.page_size.toString() }),
      // Legacy support
      ...(filters.limit && !filters.page_size && { limit: filters.limit.toString() }),
    });

    const response = await search.get<{ results: GallerySearchResult[]; count: number; next: string | null; previous: string | null }>(
      `galleries/?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Get user's search history
   */
  async getSearchHistory(limit: number = 10, searchType?: string): Promise<SearchHistoryResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(searchType && { search_type: searchType }),
    });

    const response = await search.get<SearchHistoryResponse>(`history/?${params.toString()}`);
    return response.data;
  }

  /**
   * Get user's recent search history (5 most recent, no duplicates)
   */
  async getRecentSearchHistory(): Promise<SearchHistoryResponse> {
    const response = await search.get<SearchHistoryResponse>('history/recent/');
    return response.data;
  }
}

export const searchService = new SearchService();

