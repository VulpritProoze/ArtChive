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
  novel_post?: NovelPost[];
  comments?: PaginatedComments;
  comment_count: number;
  channel_id?: string; 
  hearts_count?: number
  is_hearted_by_user: boolean
}

export interface PostHeart {
  id: number
  post_id: string 
  author: string
  author_username: string 
  hearted_at: string
}

type PaginatedComments = {
  count? : number;
  next?: string | null;
  previous?: string | null;
  results?: Comment[];
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