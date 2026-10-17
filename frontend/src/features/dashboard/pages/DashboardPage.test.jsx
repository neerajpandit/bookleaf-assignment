import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from './DashboardPage.jsx';
import { AuthProvider } from '../../auth/context/AuthContext.jsx';
import * as authApi from '../../auth/api/authApi.js';
import * as booksApi from '../../books/api/booksApi.js';
import * as ticketsApi from '../../tickets/api/ticketsApi.js';
import { mockAuthorUser } from '../../../test/helpers.jsx';
import { mockBooks, mockTicket } from '../../../test/fixtures.js';

vi.mock('../../auth/api/authApi.js');
vi.mock('../../books/api/booksApi.js');
vi.mock('../../tickets/api/ticketsApi.js');

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authApi.getCurrentUser.mockResolvedValue(mockAuthorUser);
    booksApi.fetchAllBooks.mockResolvedValue(mockBooks);
    booksApi.listBooks.mockResolvedValue({
      items: mockBooks,
      pagination: { page: 1, limit: 5, total: 2, totalPages: 1 },
    });
    ticketsApi.getOpenTicketCount.mockResolvedValue(1);
    ticketsApi.listTickets.mockResolvedValue({
      items: [mockTicket],
      pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
    });
  });

  it('renders summary cards from API book data', async () => {
    renderDashboard();

    expect(await screen.findByText('Total books')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('₹11,970')).toBeInTheDocument();
    expect(screen.getByText('₹3,570')).toBeInTheDocument();
    expect(screen.getByText('Open tickets')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view my books/i })).toBeInTheDocument();
    expect(screen.getByText('Recent books')).toBeInTheDocument();
    expect(screen.getByText('Recent support tickets')).toBeInTheDocument();
  });

  it('shows an error state when the API fails', async () => {
    booksApi.fetchAllBooks.mockRejectedValue({
      normalized: { message: 'Unable to reach the server.', isNetworkError: true },
    });

    renderDashboard();

    expect(await screen.findByText(/unable to load dashboard/i)).toBeInTheDocument();
  });

  it('shows loading while fetching', () => {
    booksApi.fetchAllBooks.mockImplementation(() => new Promise(() => {}));

    renderDashboard();

    expect(screen.getByRole('status')).toHaveTextContent(/loading your dashboard/i);
  });
});
