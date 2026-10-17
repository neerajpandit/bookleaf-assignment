import { Navigate, Outlet, useLocation } from 'react-router-dom';
import LoadingIndicator from '../components/feedback/LoadingIndicator.jsx';
import ErrorState from '../components/feedback/ErrorState.jsx';
import { useAuth } from '../features/auth/hooks/useAuth.js';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, isNetworkError, initError, refreshUser } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingIndicator label="Checking your session…" />;
  }

  if (isNetworkError) {
    return (
      <ErrorState
        title="Connection problem"
        message={initError || 'Unable to reach the server. Your session status is unknown.'}
        onRetry={refreshUser}
        retryLabel="Retry connection"
      />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
