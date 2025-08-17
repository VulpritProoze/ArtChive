import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@context/auth-context'

export default function ProtectedRoute() {
    const { user, isLoading } = useAuth()

    if (isLoading) {
        return null
    }

    return user ? <Outlet /> : <Navigate to='/login' replace />
}