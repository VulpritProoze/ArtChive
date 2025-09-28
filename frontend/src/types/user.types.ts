import type { CollectiveMember } from './collective.type'

export type User = {
  id: number;
  username: string;
  email: string;
  collective_memberships: CollectiveMember[];
} | null;