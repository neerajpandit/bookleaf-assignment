import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button.jsx';
import FormField from '../../../components/ui/FormField.jsx';
import Input from '../../../components/ui/Input.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { validateLoginForm } from '../validation/loginValidation.js';
import { normalizeApiError } from '../../../lib/apiError.js';
import { INVALID_CREDENTIALS_MESSAGE } from '../constants.js';

export function LoginPage() {
  const { isAuthenticated, isLoading, user, login, getRoleLandingPath } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from;

  if (!isLoading && isAuthenticated && user) {
    const destination = from && from !== '/login' ? from : getRoleLandingPath(user.role);
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    const validation = validateLoginForm({ email, password });
    setFieldErrors(validation.errors);

    if (!validation.isValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const loggedInUser = await login({ email: email.trim(), password });
      const destination =
        from && from !== '/login' ? from : getRoleLandingPath(loggedInUser.role);
      navigate(destination, { replace: true });
    } catch (error) {
      const normalized = error.normalized || normalizeApiError(error);

      if (normalized.isUnauthorized) {
        setSubmitError(INVALID_CREDENTIALS_MESSAGE);
      } else if (normalized.isRateLimited) {
        setSubmitError('Too many login attempts. Please wait and try again.');
      } else if (normalized.isNetworkError) {
        setSubmitError(normalized.message);
      } else {
        setSubmitError(normalized.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Sign in to BookLeaf</h1>
        <p className="mt-1 text-sm text-slate-600">
          Access your author support and communication portal.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <FormField id="email" label="Email" error={fieldErrors.email}>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              hasError={Boolean(fieldErrors.email)}
              disabled={isSubmitting}
              required
            />
          </FormField>

          <FormField id="password" label="Password" error={fieldErrors.password}>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              hasError={Boolean(fieldErrors.password)}
              disabled={isSubmitting}
              required
            />
          </FormField>

          {submitError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {submitError}
            </p>
          ) : null}

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
