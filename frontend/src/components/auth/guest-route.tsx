import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@context/auth-context'


export function GuestRoute() {
    const { user } = useAuth()

    return user ? <Navigate to='/home' replace /> : <Outlet />
}