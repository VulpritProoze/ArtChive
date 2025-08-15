import {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import api from "@lib/api";
import type { AuthContextType, User } from "@src/types";

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: async () => {},
  refreshToken: async () => {},
  loading: true,
  shouldSkipAuth: () => false,
});

type AuthProviderProps = {
  children: ReactNode;
  skipPaths?: string[]; // Optional array of paths to skip auth
};

export const AuthProvider = ({
  children,
  skipPaths = ["/", "/login", "/register"], // Default paths to skip auth
}: AuthProviderProps) => {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Function to check if current path should skip auth
  const shouldSkipAuth = useCallback(
    (path: string): boolean => {
      return skipPaths.includes(path);
    },
    [skipPaths]
  );

  const fetchUser = async (): Promise<boolean> => {
    try {
      const response = await api.get("api/core/auth/me/", {
        withCredentials: true,
      });
      setUser(response.data);
      return true;
    } catch (error) {
      console.error("Failed to fetch user: ", error);
      setUser(null);
      return false;
    }
  };

  // Auth check with path-based skipping
  useEffect(() => {
    const currentPath = window.location.pathname;
    if (shouldSkipAuth(currentPath)) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const checkAuth = async () => {
      try {
        await fetchUser();
      } catch (error) {
        console.error("Auth check failed: ", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [shouldSkipAuth]);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      await api.post(
        "api/core/auth/login/",
        { email, password },
        { withCredentials: true }
      );
      await fetchUser();
    } catch (error) {
      console.error("Login failed: ", error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post("api/core/auth/logout/", {}, { withCredentials: true });
    } catch (error) {
      console.error("Logout failed: ", error);
    } finally {
      setUser(null);
    }
  };

  const refreshToken = async (): Promise<void> => {
    try {
      await api.post(
        "api/core/auth/token/refresh/",
        {},
        { withCredentials: true }
      );
      await fetchUser();
    } catch (error) {
      console.error("Token refresh failed: ", error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    refreshToken,
    loading,
    shouldSkipAuth, // Expose this to other components
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
