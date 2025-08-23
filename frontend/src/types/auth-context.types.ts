import type { User } from './user.types'

export type AuthContextType = {
  user: User;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  refreshToken: () => Promise<void>;
  getUserId: () => number | null;
};