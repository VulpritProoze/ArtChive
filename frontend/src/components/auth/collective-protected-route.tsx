import { Outlet, Navigate, useParams } from 'react-router-dom'
import { useAuth } from '@context/auth-context'

export default function CollectiveProtectedRoute() {
    const { checkIfCollectiveMember } = useAuth()
    const { collectiveId } = useParams()
    const isMember = checkIfCollectiveMember(collectiveId)

    if (isMember) {
        return <Outlet />
    }
    
    if (!collectiveId) {
        console.error('Collective Id is missing to check for user\'s membership status')
        
    }

    if (!isMember) {
        console.error('User is not a member of this collective.')
    }

    return <Navigate to='/collective' replace />
}