import { useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '@context/auth-context'

export const LogoutButton = () => {
    const authContext = useContext(AuthContext)
    const navigate = useNavigate()

    const handleLogout = async () => {
        if (authContext && typeof authContext.logout === 'function') {
            await authContext.logout()
            navigate('/login')
        }
    }

    return <button className='btn btn-primary' onClick={handleLogout}>Logout</button>
}