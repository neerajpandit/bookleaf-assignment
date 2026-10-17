import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminTicketQueuePage from './AdminTicketQueuePage.jsx';
import { AuthProvider } from '../../auth/context/AuthContext.jsx';
import * as authApi from '../../auth/api/authApi.js';
import * as adminTicketsApi from '../api/adminTicketsApi.js';
import { mockAdminUser, mockAdminTicket } from '../../../test/fixtures.js';

vi.mock('../../auth/api/authApi.js');
vi.mock('../api/adminTicketsApi.js');

function renderQueue(initialEntry = '/admin/tickets') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/admin/tickets" element={<AdminTicketQueuePage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AdminTicketQueuePage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authApi.getCurrentUser.mockResolvedValue(mockAdminUser);
  });

  it('renders queue items and supports pagination params', async () => {
    adminTicketsApi.listAdminTickets.mockResolvedValue({
      items: [mockAdminTicket],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    renderQueue();

    expect((await screen.findAllByText('Royalty payout question')).length).toBeGreaterThan(0);
    expect(adminTicketsApi.listAdminTickets).toHaveBeenCalled();
  });

  it('shows empty state when no tickets match', async () => {
    adminTicketsApi.listAdminTickets.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    renderQueue();

    expect(await screen.findByText(/no tickets match these filters/i)).toBeInTheDocument();
  });

  it('passes AI processing status filter to the queue API', async () => {
    adminTicketsApi.listAdminTickets.mockResolvedValue({
      items: [{ ...mockAdminTicket, aiProcessingStatus: 'FAILED' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    renderQueue('/admin/tickets?aiProcessingStatus=FAILED');

    await waitFor(() => {
      expect(adminTicketsApi.listAdminTickets).toHaveBeenCalledWith(
        expect.objectContaining({ aiProcessingStatus: 'FAILED' }),
      );
    });

    expect(await screen.findByRole('cell', { name: /failed/i })).toBeInTheDocument();
  });

  it('debounces search input before querying', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    adminTicketsApi.listAdminTickets.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    renderQueue();

    await waitFor(() => {
      expect(adminTicketsApi.listAdminTickets).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(screen.getByPlaceholderText(/ticket #, subject, author/i), {
      target: { value: 'TKT-5001' },
    });

    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(adminTicketsApi.listAdminTickets.mock.calls.some(([params]) => params.search === 'TKT-5001')).toBe(
        true,
      );
    });

    vi.useRealTimers();
  });
});
