import { Outlet, Navigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { toast } from 'react-toastify'
import { useAuth } from '@context/auth-context'

export default function CollectiveProtectedRoute() {
    const { checkIfCollectiveMember } = useAuth()
    const { collectiveId } = useParams()
    const isMember = checkIfCollectiveMember(collectiveId)

    if (isMember) {
        return <Outlet />
    }

    useEffect(() => {
        if (!collectiveId) {
          toast.error("Collective ID is missing in URL");
        } else if (!isMember) {
          toast.info("You need to join this collective to access this page");
        }
    }, [collectiveId, isMember]);

    return <Navigate to='/collective' replace />
}