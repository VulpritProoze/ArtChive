import type { User } from '@types'

export type AuthContextType = {
  user: User;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  loading: boolean;
};