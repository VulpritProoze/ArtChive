import type { CollectiveMember } from './collective.type'

export type User = {
  id: number;
  username: string;
  email: string;
  is_superuser: boolean;
  profile_picture: string;
  artist_types: string[];
  fullname: string;
  brushdrips_count: string
  collective_memberships: CollectiveMember[];
} | null;