import { createContext, useState, useEffect, useContext } from "react";
import api, { collective } from '@lib/api'
import type { AuthContextType, User, CollectiveMember } from "@types";
import { isAxiosError } from "axios";
import { toast } from "react-toastify";
import formatFieldName from '@utils/format-fieldname'

type CollectiveMemberType = CollectiveMember[] | null

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState<User>(null);
  const [collectiveMemberships, setCollectiveMemberships] = useState<CollectiveMemberType>(null)
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

  const isMemberOfACollective = (collectiveId: string) => {
    if (!collectiveMemberships) return false
    // Check if the collectiveId matches any id in collectiveMemberships
    // some() returns true for any truthy element

    return collectiveMemberships.some(
      (member) => member !== null && member.collective_id === collectiveId
    )
  }

  const isAdminOfACollective = (collectiveId: string) => {
    console.log('is admin called', )
    if (!collectiveMemberships) return false

    return collectiveMemberships.some(
      (member) => member !== null && member.collective_id === collectiveId && member.collective_role === 'admin'
    )
  }

  const fetchCollectiveMemberDetails = async () => {
    try {
      const response = await collective.get('collective-memberships/', { withCredentials: true })
      setCollectiveMemberships(response.data)

      return true
    } catch(error) {
      console.error('Failed to fetch collective memberships information: ', error)
      setCollectiveMemberships(null)
      throw error
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await fetchUser()
        await fetchCollectiveMemberDetails()
      } catch (err) {
        throw err
      } finally {
        setIsLoading(false)
      }
    };

    checkAuth();
  }, []);

  const register = async (
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
  ): Promise<boolean> => {
    try {
      try {
        await logout()
      } catch (logoutError) {
        console.log('No active session to logout from')
      }

      await api.post(
        'api/core/auth/register/',
        { username, email, password, confirmPassword, firstName, middleName, lastName, city, country, birthday, artistTypes }
      )

      await login(email, password)

      toast.success('Registration successful! Redirecting...')
      return true
    } catch (error) {
      let errorMessage = 'Registration failed. Please try again';
      
      if (isAxiosError(error)) {
        // Handle specific error cases
        if (error.response?.status === 400) {
          const errorData = error.response.data;
      
          if (typeof errorData === 'object' && errorData !== null) {
            // Loop through each field and show a separate toast
            Object.entries(errorData).forEach(([field, messages]) => {
              const fieldName = formatFieldName(field); // Optional: make field names user-friendly
              const messageList = Array.isArray(messages) ? messages : [messages];
              
              messageList.forEach(msg => {
                toast.error(`${fieldName}: ${msg}`);
              });
            });
          } else {
            toast.error("Please check your registration details.");
          }
      
          return false; // Exit early after showing toasts
        }
        else if (error.response?.status === 401) {
          errorMessage = "Please fill up the registration form properly";
        } 
        else if (error.response?.status === 409) {
          errorMessage = "User with this email or username already exists";
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
      
      toast.error(errorMessage);
      console.error("Registration failed: ", error);
      return false
    }
  }

  const login = async (email: string, password: string): Promise<void> => {
    try {
      await api.post(
        "api/core/auth/login/",
        { email, password },
        { withCredentials: true }
      );

      await fetchUser();
      await fetchCollectiveMemberDetails()
      toast.success('Login successful!')
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
      setCollectiveMemberships(null)
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
    register,
    isLoading,
    refreshToken,
    getUserId,
    collectiveMemberships,
    fetchCollectiveMemberDetails,
    fetchUser,
    isMemberOfACollective,
    isAdminOfACollective
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