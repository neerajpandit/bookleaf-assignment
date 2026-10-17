import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminLayout from './AdminLayout.jsx';
import { AuthProvider } from '../features/auth/context/AuthContext.jsx';
import * as authApi from '../features/auth/api/authApi.js';
import { mockAdminUser } from '../test/helpers.jsx';

vi.mock('../features/auth/api/authApi.js');

function TicketsRouteEcho() {
  const location = useLocation();
  return <div>Tickets page{location.search}</div>;
}

function renderLayout(initialEntry = '/admin') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<div>Overview page</div>} />
              <Route path="tickets" element={<TicketsRouteEcho />} />
              <Route path="account" element={<div>Account page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authApi.getCurrentUser.mockResolvedValue(mockAdminUser);
  });

  it('renders sidebar navigation and top navbar', async () => {
    renderLayout();

    expect(await screen.findByLabelText('Admin navigation sidebar')).toBeInTheDocument();
    expect(screen.getByLabelText('Search tickets')).toBeInTheDocument();
    expect(screen.getByText('Test Admin')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'All Tickets' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'All Authors' })).toBeInTheDocument();
  });

  it('reflects active navigation for the current route', async () => {
    renderLayout('/admin/tickets');

    expect(await screen.findByText('Tickets page')).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Admin sidebar' }).querySelector('[aria-current="page"]'),
    ).toHaveAccessibleName('All Tickets');
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
    expect(screen.getByLabelText('Admin navigation sidebar')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Account' }));
    expect(await screen.findByText('Account page')).toBeInTheDocument();
  });

  it('navigates to ticket search from the top navbar', async () => {
    const user = userEvent.setup();
    renderLayout('/admin/tickets');

    await screen.findByText('Tickets page');
    await user.type(screen.getByLabelText('Search tickets'), 'TKT-1001{enter}');

    expect(await screen.findByText(/Tickets page\?search=TKT-1001/)).toBeInTheDocument();
  });
});
