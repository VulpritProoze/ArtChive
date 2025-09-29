import type { CollectiveMember } from './collective.type'

export type User = {
  id: number;
  username: string;
  email: string;
  profile_picture: string;
  artist_types: string[];
  fullname: string;
  collective_memberships: CollectiveMember[];
} | null;