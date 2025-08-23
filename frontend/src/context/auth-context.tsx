import { createContext, useState, useEffect, useContext } from "react";
import api from '@lib/api'
import type { AuthContextType, User } from "@types";
import { isAxiosError } from "axios";
import { toast } from "react-toastify";

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState<User>(null);
  const [isLoading, setIsLoading] = useState(true)

  const getUserId = () => {
    return user?.id || null
  }

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
      throw error
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await fetchUser()
        console.log('authenticated')
      } catch (err) {
        console.error('not authenticated', err)
        throw err
      } finally {
        setIsLoading(false)
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      await logout();

      await api.post(
        "api/core/auth/login/",
        { email, password }
      );

      await fetchUser();
      toast.success('Login successful! Redirecting...')
    } catch (error) {
      let errorMessage = 'Login failed. Please try again'
      
      if (isAxiosError(error)) {
        // Now TypeScript knows error.response exists
        if (error.response?.status === 401) {
          errorMessage = "Invalid email or password. Please try again.";
        } 
        else if (error.response) {
          errorMessage = error.response.data?.message || 
          error.response.data?.detail || 
          `Error: ${error.response.status}`;
        } else if (error.request) {
          errorMessage = "No response from server. Please check your connection.";
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage)
      console.error("Login failed: ", error);
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

  const contextValue: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
    refreshToken,
    getUserId,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

export const useUserId = () => {
  const { user } = useAuth()
  return user?.id || null
}