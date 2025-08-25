import type { User } from './user.types'

export type AuthContextType = {
  user: User;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
    confirmPassword: string,
    firstName: string,
    middleName: string,
    lastName: string,
    city: string,
    country: string,
    birthday: string | null,
    artistTypes: string[]
  ) => Promise<boolean>;
  isLoading: boolean;
  refreshToken: () => Promise<void>;
  getUserId: () => number | null;
};