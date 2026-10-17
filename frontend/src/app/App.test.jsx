import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import AppProviders from './providers.jsx';
import { appRoutes } from './router.jsx';
import * as authApi from '../features/auth/api/authApi.js';

vi.mock('../features/auth/api/authApi.js');

describe('Application startup', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authApi.getCurrentUser.mockRejectedValue({
      normalized: { isUnauthorized: true, isNetworkError: false },
    });
  });

  it('renders the login route by default', async () => {
    const memoryRouter = createMemoryRouter(appRoutes, {
      initialEntries: ['/login'],
    });

    render(
      <AppProviders>
        <RouterProvider router={memoryRouter} />
      </AppProviders>,
    );

    expect(await screen.findByRole('heading', { name: /sign in to bookleaf/i })).toBeInTheDocument();
  });

  it('renders the not-found page for unknown routes', async () => {
    const memoryRouter = createMemoryRouter(appRoutes, {
      initialEntries: ['/does-not-exist'],
    });

    render(
      <AppProviders>
        <RouterProvider router={memoryRouter} />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(screen.getByText('Page not found')).toBeInTheDocument();
    });
  });
});
