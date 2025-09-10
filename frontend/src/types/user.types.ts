export type User = {
  id: number;
  username: string;
  email: string;
  collective_memberships: string[];
} | null;