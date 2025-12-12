export interface NovelPost {
  chapter: number;
  content: string;
}

export interface PostForm {
  description: string;
  post_type: string;
  image_url: File | null;
  video_url: File | null;
  chapters: {
    chapter: string;
    content: string;
  }[],
  channel_id?: string;
}

export interface Post {
  post_id: string;
  description: string;
  created_at: string;
  updated_at: string;
  image_url?: string;
  video_url?: string;
  post_type: string;
  author?: number;
  author_fullname?: string;
  author_username?: string;
  author_artist_types?: string[];
  author_picture?: string;
  collective: string;
  collective_id?: string | null;
  collective_title?: string | null;
  channel_name?: string;
  novel_post?: NovelPost[];
  comments?: Comment[];
  comment_count?: number; // Optional - fetched via bulk-meta endpoint
  channel_id?: string; 
  hearts_count?: number; // Optional - fetched via bulk-meta endpoint
  is_hearted_by_user?: boolean; // Optional - not in bulk-meta
  praise_count?: number; // Optional - fetched via bulk-meta endpoint
  is_praised_by_user?: boolean; // Optional - not in bulk-meta
  trophy_count?: number; // Optional - fetched via bulk-meta endpoint
  user_awarded_trophies?: string[]; // Optional - fetched via bulk-meta endpoint
  trophy_counts_by_type?: Record<string, number>; // Optional - fetched via bulk-meta endpoint (as trophy_breakdown)
}

export interface PostHeart {
  id: number
  post_id: string 
  author: number
  author_username: string
  author_fullname: string
  author_picture?: string
  hearted_at: string
}

export interface Comment {
  comment_id: string;
  text: string;
  created_at: string;
  updated_at: string;
  post_id: string;
  author: number;
  author_username: string;
  author_picture?: string
  author_artist_types?: string[]
  title: string;
  replies_to?: string
  reply_count?: number
  replies?: Comment[]
  is_replying?: boolean // UI state for reply form
  show_replies?: boolean  // UI state to show/hide replies
}

export interface CommentReplyForm {
  text: string
  replies_to: string
  post_id: string
}

export interface PostsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Post[];
}

export interface Critique {
  critique_id: string;
  text: string;
  impression: string;
  created_at: string;
  updated_at: string;
  post_id: string;
  author: number;
  author_username: string;
  author_picture?: string;
  author_fullname?: string;
  author_artist_types?: string[];
  author_reputation?: number;
  post_title: string;
  reply_count: number;
  is_deleted: boolean;
  replies?: Comment[]
  show_replies?: boolean
  is_replying?: boolean
}

export interface CritiqueForm {
  text: string;
  impression: string;
  post_id: string;
}

export interface CritiqueReplyForm {
  text: string;
  critique_id: string;
}

export interface PostPraise {
  id: number;
  post_id: string;
  author: number;
  praised_at: string;
  author_username: string;
  author_picture?: string;
  author_fullname: string;
  post_description: string;
}

export interface PostTrophy {
  id: number;
  post_id: string;
  author: number;
  awarded_at: string;
  post_trophy_type: number;
  author_username: string;
  author_picture?: string;
  author_fullname: string;
  post_description: string;
  trophy_type_name: string;
  trophy_brush_drip_value: number;
}

export interface TrophyType {
  name: string;
  displayName: string;
  cost: number;
  icon: string;
}

export interface PraiseStatusResponse {
  post_id: string;
  praise_count: number;
  is_praised_by_user: boolean;
}

export interface TrophyStatusResponse {
  post_id: string;
  trophy_counts: {
    bronze_stroke: number;
    golden_bristle: number;
    diamond_canvas: number;
  };
  total_trophy_count: number;
  user_awarded_trophies: string[];
}