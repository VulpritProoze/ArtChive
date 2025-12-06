import { Navigate, Outlet, useParams } from 'react-router-dom';
import { toast } from '@utils/toast.util';
import { useAuth } from '@context/auth-context';

export default function CollectiveAdminRoute() {
  const { isAdminOfACollective } = useAuth();
  const { collectiveId } = useParams();

  if (!collectiveId) {
    toast.error("Access denied", "Collective ID is missing in URL");
    return <Navigate to="/collective" replace />;
  }

  const isAdmin = isAdminOfACollective(collectiveId);

  if (!isAdmin) {
    toast.error("Access denied", "You must be an admin to access this page");
    return <Navigate to={`/collective/${collectiveId}`} replace />;
  }

  // User is admin, allow access to child routes
  return <Outlet />;
}

