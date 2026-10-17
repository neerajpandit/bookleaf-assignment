import AccessDenied from '../components/common/AccessDenied.jsx';
import { useAuth } from '../features/auth/hooks/useAuth.js';

export function RoleRoute({ allowedRoles, children }) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <AccessDenied />;
  }

  return children;
}

export default RoleRoute;
