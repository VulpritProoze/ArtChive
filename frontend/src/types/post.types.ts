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
  collective: string;
  novel_post?: NovelPost[];
}

export type Comment = {
  comment_id: string;
  text: string;
  created_at: string;
  updated_at: string;
  post_id: string;
  author: string;
  author_username: string;
  post_title: string;
}