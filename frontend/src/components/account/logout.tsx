import { useNavigate } from 'react-router-dom'
import { useAuth } from '@context/auth-context'
import { toast } from "@utils/toast.util";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'

interface LogoutButtonProps {
  className?: string
  icon?: React.ReactNode
}

export const LogoutButton = ({ className = '', icon }: LogoutButtonProps) => {
  const navigate = useNavigate()
  const { logout, componentLoading } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
      toast.success('Logged out', 'Logout successful!')
    } catch (error) {
      console.error('Logout failed', error)
      toast.error('Logout failed. Please try again.')
    }
  }

  return (
    <button 
      className={`btn btn-primary ${className} ${componentLoading ? 'opacity-70 cursor-not-allowed' : ''}`} 
      onClick={handleLogout}
      disabled={componentLoading}
    >
      {componentLoading ? (
        <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
      ) : (
        icon && <span className="mr-2">{icon}</span>
      )}
      
      <span>{componentLoading ? 'Logging out...' : 'Logout'}</span>
    </button>
  )
}