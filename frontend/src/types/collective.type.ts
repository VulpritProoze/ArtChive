import type { Post } from "./post.types";

export interface CollectiveMember {
  id: number;
  collective_id: string;
  collective_role: string;
  member: number;
}

export interface Collective {
  collective_id: string;
  channels: Channel[];
  members: any[];
  title: string;
  description: string;
  rules: string[];
  artist_types: string[];
  created_at: string;
  updated_at: string;
}

export interface Channel {
  channel_id: string;
  title: string;
}

export interface CollectivePost extends Post {
  channel: string;
}