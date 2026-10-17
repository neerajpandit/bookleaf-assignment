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

function renderAdminRoute(user, path = '/admin') {
  authApi.getCurrentUser.mockResolvedValue(user);

  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route
              path="/admin"
              element={
                <RoleRoute allowedRoles={[ROLES.ADMIN]}>
                  <div>Admin area</div>
                </RoleRoute>
              }
            />
            <Route
              path="/author"
              element={
                <RoleRoute allowedRoles={[ROLES.AUTHOR]}>
                  <div>Author area</div>
                </RoleRoute>
              }
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('Admin route protection', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('allows ADMIN users into admin pages', async () => {
    renderAdminRoute(mockAdminUser, '/admin');
    expect(await screen.findByText('Admin area')).toBeInTheDocument();
  });

  it('denies AUTHOR users from admin pages', async () => {
    renderAdminRoute(mockAuthorUser, '/admin');
    expect(await screen.findByText('Access denied')).toBeInTheDocument();
    expect(screen.queryByText('Admin area')).not.toBeInTheDocument();
  });
});
