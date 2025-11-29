import { Navigate } from 'react-router-dom';
import { useAuth } from '@context/auth-context';
import { SimpleLoadingSpinner } from '@components/loading-spinner';
import { MainLayout } from '@components/common/layout';

/**
 * Redirects /profile to /profile/@/{username}
 * This allows users to view their own profile timeline
 */
export default function NavigateToOwnProfile() {
  const { user, initialized } = useAuth();

  if (!initialized) {
    return (
      <MainLayout showRightSidebar={false}>
        <div className="flex justify-center items-center min-h-screen">
          <SimpleLoadingSpinner text="Loading..." />
        </div>
      </MainLayout>
    );
  }

  if (!user?.username) {
    // If no user, redirect to home
    return <Navigate to="/home" replace />;
  }

  // Redirect to user's own profile timeline with @ decoration
  return <Navigate to={`/profile/@${user.username}`} replace />;
}

