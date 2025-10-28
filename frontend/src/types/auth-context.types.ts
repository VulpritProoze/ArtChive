import type { CollectiveMember } from './collective.type';
import type { User } from './user.types'

type CollectiveMemberType = CollectiveMember[] | null

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
  initialized: boolean;
  refreshToken: () => Promise<void>;
  refreshUser: () => Promise<User>;
  getUserId: () => number | null;
  collectiveMemberships;
  fetchCollectiveMemberDetails: () => Promise<CollectiveMemberType>;
  fetchUser: () => Promise<User>;
  isMemberOfACollective: (collectiveId: string | undefined) => boolean;
  isAdminOfACollective: (collectiveId: string | undefined) => boolean;
  initializeAuth,
  componentLoading: boolean,
};