import { Link } from 'react-router-dom';
import Button from '../ui/Button.jsx';
import { useAuth } from '../../features/auth/hooks/useAuth.js';

export function AccessDenied() {
  const { user, getRoleLandingPath } = useAuth();
  const homePath = user ? getRoleLandingPath(user.role) : '/login';

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Access denied</h1>
      <p className="mt-2 text-sm text-slate-600">
        You do not have permission to view this page. Contact your administrator if you believe
        this is a mistake.
      </p>
      <div className="mt-6">
        <Link to={homePath}>
          <Button variant="secondary">Go to your home page</Button>
        </Link>
      </div>
    </div>
  );
}

export default AccessDenied;
