import { Outlet, Navigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { toast } from 'react-toastify'
import { useAuth } from '@context/auth-context'

export default function CollectiveProtectedRoute() {
    const { isMemberOfACollective } = useAuth()
    const { collectiveId } = useParams()
    const isMember = isMemberOfACollective(collectiveId)

    if (isMember) {
        return <Outlet />
    }
    
    if (!collectiveId) {
      toast.error("Collective ID is missing in URL");
    } else if (!isMember) {
      toast.info("You need to join this collective to access this page");
    }

    return <Navigate to='/collective' replace />
}