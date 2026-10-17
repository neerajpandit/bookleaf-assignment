import { Link } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import { useAuth } from '../features/auth/hooks/useAuth.js';

export function NotFoundPage() {
  const { isAuthenticated, user, getRoleLandingPath } = useAuth();
  const homePath = isAuthenticated && user ? getRoleLandingPath(user.role) : '/login';

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 text-sm text-slate-600">
        The page you requested does not exist or may have moved.
      </p>
      <div className="mt-6">
        <Link to={homePath}>
          <Button variant="secondary">Return home</Button>
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
