import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import { AuthProvider } from '../features/auth/context/AuthContext.jsx';
import * as authApi from '../features/auth/api/authApi.js';
import { mockAuthorUser } from '../test/helpers.jsx';

vi.mock('../features/auth/api/authApi.js');

function renderProtectedRoute(initialRoute = '/author') {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/login" element={<div>Login page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/author" element={<div>Author area</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows loading while authentication initializes', () => {
    authApi.getCurrentUser.mockImplementation(() => new Promise(() => {}));

    renderProtectedRoute();

    expect(screen.getByRole('status')).toHaveTextContent(/checking your session/i);
  });

  it('redirects unauthenticated users to login', async () => {
    authApi.getCurrentUser.mockRejectedValue({
      normalized: { isUnauthorized: true, isNetworkError: false },
    });

    renderProtectedRoute('/author');

    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  it('allows authenticated users through', async () => {
    authApi.getCurrentUser.mockResolvedValue(mockAuthorUser);

    renderProtectedRoute('/author');

    expect(await screen.findByText('Author area')).toBeInTheDocument();
  });

  it('shows a connection error instead of treating network failure as logout', async () => {
    authApi.getCurrentUser.mockRejectedValue({
      normalized: {
        isNetworkError: true,
        message: 'Unable to reach the server. Check your connection and try again.',
      },
    });

    renderProtectedRoute('/author');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/connection problem/i);
    });

    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });
});
