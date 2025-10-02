import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@context/auth-context'
import { toast } from 'react-toastify'
import { LoadingSpinner } from '@components/loading-spinner'

export default function ProtectedRoute() {
    const { user, isLoading } = useAuth()

    if (isLoading) {
        return <LoadingSpinner text={"Loading..."} />
    }

    if (user) {
        return <Outlet />
    }

    toast.warn('You are currently not logged in.')
    return <Navigate to='/login' replace />
}