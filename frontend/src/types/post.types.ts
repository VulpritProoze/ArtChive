export type NovelPost = {
  chapter: number;
  content: string;
}

export type Post = {
  post_id: string;
  description: string;
  created_at: string;
  updated_at: string;
  image_url?: string;
  video_url?: string;
  post_type: string;
  author?: number;
  author_username?: string;
  collective: string;
  novel_post?: NovelPost[];
  comments?: PaginatedComments;
  comment_count: number;
}

type PaginatedComments = {
  count? : number;
  next?: string | null;
  previous?: string | null;
  results?: Comment[];
}

export type Comment = {
  comment_id: string;
  text: string;
  created_at: string;
  updated_at: string;
  post_id: string;
  author: number;
  author_username: string;
  title: string;
}

export type PostsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Post[];
}