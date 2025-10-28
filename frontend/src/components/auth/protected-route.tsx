import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@context/auth-context'
import { LoadingSpinner } from '@components/loading-spinner'
import { useEffect } from 'react'

export default function ProtectedRoute() {
    const { user, isLoading, initialized, initializeAuth } = useAuth()

    // Initialize auth on mount
    useEffect(() => {
        initializeAuth()
    }, [])

    // Show loading spinner while auth is being initialized or is actively loading
    // This prevents premature redirect before the auth check completes
    if (!initialized) {
        return <LoadingSpinner text={"Loading..."} />
    }

    // If user is authenticated, render the protected content
    if (user) {
        return <Outlet />
    }

    // User is not authenticated after initialization, redirect to login
    return <Navigate to='/login' replace />
}