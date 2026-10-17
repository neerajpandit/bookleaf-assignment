import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TicketsPage from './TicketsPage.jsx';
import { AuthProvider } from '../../auth/context/AuthContext.jsx';
import * as authApi from '../../auth/api/authApi.js';
import * as ticketsApi from '../api/ticketsApi.js';
import { mockAuthorUser } from '../../../test/helpers.jsx';
import { mockTicket } from '../../../test/fixtures.js';

vi.mock('../../auth/api/authApi.js');
vi.mock('../api/ticketsApi.js');

function renderTicketsPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <TicketsPage />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('TicketsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authApi.getCurrentUser.mockResolvedValue(mockAuthorUser);
  });

  it('renders ticket list with navigation links', async () => {
    ticketsApi.listTickets.mockResolvedValue({
      items: [mockTicket],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderTicketsPage();

    expect((await screen.findAllByText('Royalty payout question')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('TKT-1001').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /royalty payout question/i })[0]).toHaveAttribute(
      'href',
      `/author/tickets/${mockTicket.id}`,
    );
    expect(
      screen.getAllByRole('link', { name: /open conversation for ticket tkt-1001/i }).length,
    ).toBeGreaterThan(0);
  });

  it('shows pagination metadata from the API', async () => {
    ticketsApi.listTickets.mockResolvedValue({
      items: [mockTicket],
      pagination: { page: 1, limit: 10, total: 12, totalPages: 2 },
    });

    renderTicketsPage();

    expect(await screen.findByText(/showing 1–10 of 12 tickets/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
  });

  it('passes selected filters to the ticket list API and resets pagination', async () => {
    const user = userEvent.setup();
    ticketsApi.listTickets.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });

    renderTicketsPage();

    await user.selectOptions(await screen.findByLabelText(/^status$/i), 'OPEN');
    await waitFor(() => {
      expect(ticketsApi.listTickets).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'OPEN', page: 1 }),
      );
    });
  });

  it('shows an empty state when there are no tickets', async () => {
    ticketsApi.listTickets.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });

    renderTicketsPage();

    expect(await screen.findByText(/no support tickets yet/i)).toBeInTheDocument();
  });
});
