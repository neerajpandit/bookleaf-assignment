import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminDashboardPage from './AdminDashboardPage.jsx';
import { AuthProvider } from '../../auth/context/AuthContext.jsx';
import * as authApi from '../../auth/api/authApi.js';
import * as adminTicketsApi from '../api/adminTicketsApi.js';
import * as adminAuthorsApi from '../api/adminAuthorsApi.js';
import { mockAdminUser } from '../../../test/fixtures.js';

vi.mock('../../auth/api/authApi.js');
vi.mock('../api/adminTicketsApi.js');
vi.mock('../api/adminAuthorsApi.js');

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <AdminDashboardPage />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authApi.getCurrentUser.mockResolvedValue(mockAdminUser);
    adminTicketsApi.getAdminTicketCount.mockImplementation((filters) => {
      if (filters.status === 'OPEN') return Promise.resolve(5);
      if (filters.status === 'IN_PROGRESS') return Promise.resolve(2);
      if (filters.status === 'RESOLVED') return Promise.resolve(1);
      if (filters.status === 'CLOSED') return Promise.resolve(1);
      if (filters.priority === 'CRITICAL') return Promise.resolve(1);
      if (filters.assignedTo === 'unassigned') return Promise.resolve(3);
      return Promise.resolve(0);
    });
    adminTicketsApi.getAdminDashboardTicketSections.mockResolvedValue({
      urgent: [],
      oldestUnresolved: [],
      recentlyUpdated: [],
    });
    adminAuthorsApi.getAdminAuthorCount.mockResolvedValue(10);
  });

  it('renders dashboard counts from API totals', async () => {
    renderDashboard();
    expect(await screen.findByText('Open tickets')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Total authors')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('renders operational ticket sections from dashboard API data', async () => {
    adminTicketsApi.getAdminDashboardTicketSections.mockResolvedValue({
      urgent: [
        {
          id: 'urgent-1',
          ticketNumber: 'TKT-9001',
          subject: 'Critical payout issue',
          status: 'OPEN',
          priority: 'CRITICAL',
          category: 'Royalty & Payments',
          createdAt: '2025-10-01T09:00:00.000Z',
          lastMessageAt: '2025-10-17T10:00:00.000Z',
          author: { name: 'Author One', email: 'one@test.com' },
        },
      ],
      oldestUnresolved: [],
      recentlyUpdated: [],
    });

    renderDashboard();

    expect(await screen.findByText('Critical payout issue')).toBeInTheDocument();
    expect(screen.getByText('Urgent tickets')).toBeInTheDocument();
    expect(screen.getByText('Oldest unresolved tickets')).toBeInTheDocument();
  });

  it('does not fabricate totals when count queries fail', async () => {
    adminTicketsApi.getAdminTicketCount.mockRejectedValue({
      normalized: { message: 'Unable to reach the server.' },
    });

    renderDashboard();
    expect(await screen.findByText(/unable to load dashboard/i)).toBeInTheDocument();
    expect(screen.queryByText('999')).not.toBeInTheDocument();
  });

  it('shows loading state', () => {
    adminTicketsApi.getAdminTicketCount.mockImplementation(() => new Promise(() => {}));
    renderDashboard();
    expect(screen.getByRole('status')).toHaveTextContent(/loading dashboard/i);
  });

  it('shows error state', async () => {
    adminTicketsApi.getAdminTicketCount.mockRejectedValue({
      normalized: { message: 'Unable to reach the server.', isNetworkError: true },
    });
    renderDashboard();
    expect(await screen.findByText(/unable to load dashboard/i)).toBeInTheDocument();
  });
});
