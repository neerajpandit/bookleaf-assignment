import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AuthorLayout from './AuthorLayout.jsx';
import { AuthProvider } from '../features/auth/context/AuthContext.jsx';
import * as authApi from '../features/auth/api/authApi.js';
import { mockAuthorUser } from '../test/helpers.jsx';

vi.mock('../features/auth/api/authApi.js');

function renderLayout(initialEntry = '/author') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/author" element={<AuthorLayout />}>
              <Route index element={<div>Overview page</div>} />
              <Route path="books" element={<div>Books page</div>} />
              <Route path="tickets" element={<div>Tickets page</div>} />
              <Route path="account" element={<div>Account page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AuthorLayout', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authApi.getCurrentUser.mockResolvedValue(mockAuthorUser);
  });

  it('renders sidebar navigation and top navbar', async () => {
    renderLayout();

    expect(await screen.findByLabelText('Author navigation sidebar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My Books' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My Tickets' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Account' })).toBeInTheDocument();
    expect(screen.getByText('Test Author')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('reflects active navigation for the current route', async () => {
    renderLayout('/author/books');

    expect(await screen.findByText('Books page')).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Author sidebar' }).querySelector('[aria-current="page"]'),
    ).toHaveAccessibleName('My Books');
  });

  it('collapses the desktop sidebar', async () => {
    const user = userEvent.setup();
    renderLayout();

    await screen.findByText('Overview page');
    await user.click(screen.getByRole('button', { name: /collapse sidebar/i }));

    expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
  });

  it('opens and closes the mobile drawer', async () => {
    const user = userEvent.setup();
    renderLayout();

    await screen.findByText('Overview page');
    await user.click(screen.getByRole('button', { name: /open navigation menu/i }));
    await user.click(screen.getByRole('link', { name: 'Account' }));

    expect(await screen.findByText('Account page')).toBeInTheDocument();
  });

  it('uses a scrollable main content region', async () => {
    renderLayout();

    await screen.findByText('Overview page');
    const main = screen.getByRole('main');
    expect(main.className).toMatch(/overflow-y-auto/);
  });
});
