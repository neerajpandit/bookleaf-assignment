import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/authApi.js';
import { normalizeApiError } from '../../../lib/apiError.js';
import { resetUnauthorizedGuard } from '../../../lib/apiClient.js';

/** @typedef {'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'network-error'} AuthStatus */

export const AuthContext = createContext(null);

const getRoleLandingPath = (role) => {
  if (role === 'ADMIN') {
    return '/admin';
  }
  if (role === 'AUTHOR') {
    return '/author';
  }
  return '/login';
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(/** @type {AuthStatus} */ ('loading'));
  const [initError, setInitError] = useState(null);

  const refreshUser = useCallback(async () => {
    setStatus('loading');
    setInitError(null);

    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      setStatus('authenticated');
      resetUnauthorizedGuard();
      return currentUser;
    } catch (error) {
      const normalized = error.normalized || normalizeApiError(error);

      if (normalized.isUnauthorized) {
        setUser(null);
        setStatus('unauthenticated');
        resetUnauthorizedGuard();
        return null;
      }

      if (normalized.isNetworkError) {
        setInitError(normalized.message);
        setStatus('network-error');
        return null;
      }

      setUser(null);
      setStatus('unauthenticated');
      setInitError(normalized.message);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (credentials) => {
    const loggedInUser = await authApi.login(credentials);
    setUser(loggedInUser);
    setStatus('authenticated');
    setInitError(null);
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Session may already be invalid; still clear local state.
    } finally {
      setUser(null);
      setStatus('unauthenticated');
      setInitError(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: status === 'authenticated' && Boolean(user),
      isLoading: status === 'loading',
      isNetworkError: status === 'network-error',
      initError,
      status,
      login,
      logout,
      refreshUser,
      getRoleLandingPath,
    }),
    [user, status, initError, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
