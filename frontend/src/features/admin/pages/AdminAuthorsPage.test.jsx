import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminAuthorsPage from './AdminAuthorsPage.jsx';
import { AuthProvider } from '../../auth/context/AuthContext.jsx';
import * as authApi from '../../auth/api/authApi.js';
import * as adminAuthorsApi from '../api/adminAuthorsApi.js';
import { mockAdminUser } from '../../../test/helpers.jsx';

vi.mock('../../auth/api/authApi.js');
vi.mock('../api/adminAuthorsApi.js');

const mockAuthors = [
  {
    authorUserId: '665f1c2d3a4b5c6d7e8f9012',
    authorId: 'AUTH001',
    name: 'Priya Sharma',
    email: 'priya.sharma@email.com',
    phone: '+91-98765-43210',
    city: 'Mumbai',
    joinedDate: '2023-03-15T00:00:00.000Z',
    bookCount: 2,
    openTicketCount: 1,
    pendingTicketCount: 1,
  },
];

function renderAuthorsPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <AdminAuthorsPage />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AdminAuthorsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authApi.getCurrentUser.mockResolvedValue(mockAdminUser);
    adminAuthorsApi.listAdminAuthors.mockResolvedValue({
      items: mockAuthors,
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it('renders authors from the admin directory API', async () => {
    renderAuthorsPage();

    expect((await screen.findAllByText('Priya Sharma')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('AUTH001').length).toBeGreaterThan(0);
    expect(screen.getByText('1 author found')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /view details/i })[0]).toHaveAttribute(
      'href',
      '/admin/authors/665f1c2d3a4b5c6d7e8f9012',
    );
  });

  it('searches authors through the directory API', async () => {
    const user = userEvent.setup();
    renderAuthorsPage();

    await screen.findAllByText('Priya Sharma');
    await user.type(screen.getByLabelText(/search authors/i), 'Priya');

    await waitFor(
      () => {
        expect(adminAuthorsApi.listAdminAuthors).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'Priya' }),
        );
      },
      { timeout: 2000 },
    );
  });

  it('shows error state when the directory API fails', async () => {
    adminAuthorsApi.listAdminAuthors.mockRejectedValue({
      normalized: { message: 'Unable to reach the server.' },
    });

    renderAuthorsPage();
    expect(await screen.findByText(/unable to load authors/i)).toBeInTheDocument();
  });
});
