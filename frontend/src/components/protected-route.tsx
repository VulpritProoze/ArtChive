import { Navigate, useLocation } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '@src/context/auth-context'

interface ProtectedRouteProps {
    children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const context = useContext(AuthContext)

    if (!context) {
        throw new Error('useAuth must be used within an  AuthProvider')
    }

    const {isAuthenticated, loading} = context
    const location = useLocation()
    console.log('is auth', isAuthenticated)

    if (loading) return <div>Loading...</div>

    return isAuthenticated ? children : (
        <Navigate 
            to='/login'
            state={{ from: location }}
            replace
        />
    )
}