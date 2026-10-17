import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from './AuthContext.jsx';
import { useAuth } from '../hooks/useAuth.js';
import * as authApi from '../api/authApi.js';
import { mockAuthorUser } from '../../../test/helpers.jsx';

vi.mock('../api/authApi.js');

function AuthProbe() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="status">{auth.status}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="network">{String(auth.isNetworkError)}</span>
      <span data-testid="email">{auth.user?.email || 'none'}</span>
    </div>
  );
}

describe('AuthProvider initialization', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('loads the current user when a session exists', async () => {
    authApi.getCurrentUser.mockResolvedValue(mockAuthorUser);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    expect(screen.getByTestId('email')).toHaveTextContent('author@bookleaf.test');
  });

  it('marks the user unauthenticated on 401 from /auth/me', async () => {
    authApi.getCurrentUser.mockRejectedValue({
      normalized: {
        isUnauthorized: true,
        isNetworkError: false,
        message: 'Invalid or expired authentication token',
      },
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
  });

  it('treats network failures separately from logout', async () => {
    authApi.getCurrentUser.mockRejectedValue({
      normalized: {
        isUnauthorized: false,
        isNetworkError: true,
        message: 'Unable to reach the server. Check your connection and try again.',
      },
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('network-error');
    });

    expect(screen.getByTestId('network')).toHaveTextContent('true');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
  });
});
