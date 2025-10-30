import type { Post } from "./post.types";

export interface CollectiveMember {
  collective_id: string;
  collective_role: string;
  member: number;
}

export interface Member {
  id: number;
  member_id: number;
  username: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  profile_picture: string | null;
  artist_types: string[];
  collective_role: "member" | "admin";
}

export interface Collective {
  collective_id: string;
  channels: Channel[];
  members: Member[];
  member_count: number
  title: string;
  description: string;
  rules: string[];
  artist_types: string[];
  picture?: string
  created_at: string;
  updated_at: string;
}

export interface Channel {
  collective_id?: string
  channel_id: string;
  description: string;
  title: string;
}

export interface ChannelCreateForm {
  title: string;
  description: string;
  collective: string;
}

export interface CollectivePost extends Post {
  channel: string;
}