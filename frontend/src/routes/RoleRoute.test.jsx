import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import RoleRoute from './RoleRoute.jsx';
import { AuthProvider } from '../features/auth/context/AuthContext.jsx';
import * as authApi from '../features/auth/api/authApi.js';
import { mockAdminUser, mockAuthorUser } from '../test/helpers.jsx';
import { ROLES } from '../features/auth/constants.js';

vi.mock('../features/auth/api/authApi.js');

function renderRoleRoute(user, path) {
  authApi.getCurrentUser.mockResolvedValue(user);

  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route
              path="/author"
              element={
                <RoleRoute allowedRoles={[ROLES.AUTHOR]}>
                  <div>Author only</div>
                </RoleRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <RoleRoute allowedRoles={[ROLES.ADMIN]}>
                  <div>Admin only</div>
                </RoleRoute>
              }
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('RoleRoute', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('allows authors on author routes', async () => {
    renderRoleRoute(mockAuthorUser, '/author');
    expect(await screen.findByText('Author only')).toBeInTheDocument();
  });

  it('denies admins on author routes', async () => {
    renderRoleRoute(mockAdminUser, '/author');
    expect(await screen.findByText('Access denied')).toBeInTheDocument();
    expect(screen.queryByText('Author only')).not.toBeInTheDocument();
  });

  it('allows admins on admin routes', async () => {
    renderRoleRoute(mockAdminUser, '/admin');
    expect(await screen.findByText('Admin only')).toBeInTheDocument();
  });

  it('denies authors on admin routes', async () => {
    renderRoleRoute(mockAuthorUser, '/admin');
    expect(await screen.findByText('Access denied')).toBeInTheDocument();
    expect(screen.queryByText('Admin only')).not.toBeInTheDocument();
  });
});
