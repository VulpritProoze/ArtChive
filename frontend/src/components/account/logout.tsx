import { useNavigate } from 'react-router-dom'
import { useAuth } from '@context/auth-context'

export const LogoutButton = () => {
    const navigate = useNavigate()
    const { logout } = useAuth()

    const handleLogout = async () => {
        try {
            await logout()
            navigate('/login')
        } catch (error) {
            console.error('Logout failed', error)
        }
    }

    return <button className='btn btn-primary' onClick={handleLogout}>Logout</button>
}