import { createContext, useState, useEffect, useContext } from 'react'
import type { ReactNode } from 'react'
import api from '@lib/api'
import type { AuthContextType, User } from '@src/types'

type AuthProviderProps = {
    children: ReactNode;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    login: async () => {},
    logout: async () => {},
    refreshToken: async () => {},
    loading: true,
})

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User>(null)
    const [loading, setLoading] = useState<boolean>(true)

    const fetchUser = async () => {
        try {
            const response = await api.get('api/core/auth/me/', {
                withCredentials: true,
            })

            setUser(response.data)
        } catch (error) {
            console.error('Failed to fetch user: ', error)
            throw error
        }
    }

    // verify user auth on page visit
    useEffect(() => {
        const checkAuth = async () => {
            try {
                await fetchUser()
            } catch (error) {
                console.error('Auth check failed: ', error)
            } finally {
                setLoading(false)
            }
        }

        checkAuth()
    }, [])

    const login = async (email: string, password: string) => {
        try {
            await api.post('api/core/auth/login/', {email, password}, {
                withCredentials: true
            })
            await fetchUser()
        } catch (error) {
            console.error('Login failed: ', error)
            throw error
        }
    }

    const logout = async () => {
        try {
            await api.post('api/core/auth/logout/', {}, {
                withCredentials: true
            })
        } catch (error) {
            console.error('Logout failed: ', error)
        } finally {
            setUser(null)
        }
    }

    const refreshToken = async () => {
        try {
            await api.post('api/core/auth/token/refresh/', {}, {
                withCredentials: true
            })
            await fetchUser()
        } catch (error) {
            console.error('Token refresh failed: ', error)
            throw error
        }
    }

    const value: AuthContextType = {
        user, login, logout, refreshToken, loading
    }

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }

    return context
}