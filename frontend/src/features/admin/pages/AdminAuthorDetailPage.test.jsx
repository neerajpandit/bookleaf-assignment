import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminAuthorDetailPage from './AdminAuthorDetailPage.jsx';
import { AuthProvider } from '../../auth/context/AuthContext.jsx';
import * as authApi from '../../auth/api/authApi.js';
import * as adminAuthorsApi from '../api/adminAuthorsApi.js';
import * as adminTicketsApi from '../api/adminTicketsApi.js';
import { mockAdminUser } from '../../../test/helpers.jsx';

vi.mock('../../auth/api/authApi.js');
vi.mock('../api/adminAuthorsApi.js');
vi.mock('../api/adminTicketsApi.js');

const authorUserId = '665f1c2d3a4b5c6d7e8f9012';

const mockAuthor = {
  authorUserId,
  authorId: 'AUTH001',
  name: 'Priya Sharma',
  email: 'priya.sharma@email.com',
  phone: '+91-98765-43210',
  city: 'Mumbai',
  joinedDate: '2023-03-15T00:00:00.000Z',
  isActive: true,
  createdAt: '2023-03-15T00:00:00.000Z',
  updatedAt: '2025-10-17T00:00:00.000Z',
};

function renderAuthorDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[`/admin/authors/${authorUserId}`]}>
          <Routes>
            <Route path="/admin/authors/:authorUserId" element={<AdminAuthorDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AdminAuthorDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authApi.getCurrentUser.mockResolvedValue(mockAdminUser);
    adminAuthorsApi.getAdminAuthorById.mockResolvedValue(mockAuthor);
    adminAuthorsApi.listAdminAuthorBooks.mockResolvedValue({
      items: [
        {
          id: 'book-1',
          bookId: 'BK001',
          title: 'Whispers of the Ganges',
          isbn: '978-93-5XXXX-01-1',
          genre: 'Literary Fiction',
          publicationDate: '2023-06-20',
          status: 'Published & Live',
          mrp: 399,
          totalCopiesSold: 342,
          totalRoyaltyEarned: 11970,
          royaltyPaid: 8400,
          royaltyPending: 3570,
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    adminAuthorsApi.getAdminAuthorRoyaltySummary.mockResolvedValue({
      totalRoyaltyEarned: 11970,
      totalRoyaltyPaid: 8400,
      totalRoyaltyPending: 3570,
      lastRoyaltyPayoutDate: '2025-10-15T00:00:00.000Z',
    });
    adminTicketsApi.listAdminTickets.mockResolvedValue({
      items: [
        {
          id: 'ticket-1',
          ticketNumber: 'TKT-1001',
          subject: 'Royalty question',
          status: 'OPEN',
          priority: 'HIGH',
          category: 'Royalty & Payments',
          createdAt: '2025-10-17T09:00:00.000Z',
          lastMessageAt: '2025-10-17T10:00:00.000Z',
          author: mockAuthor,
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    });
  });

  it('loads author profile, books, royalty, and tickets from admin APIs', async () => {
    renderAuthorDetail();

    expect(await screen.findByRole('heading', { name: 'Priya Sharma' })).toBeInTheDocument();
    expect(screen.getByText('Mumbai')).toBeInTheDocument();
    expect(screen.getAllByText('Whispers of the Ganges').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹11,970').length).toBeGreaterThan(0);
    expect(screen.getByText('Royalty question')).toBeInTheDocument();

    await waitFor(() => {
      expect(adminAuthorsApi.getAdminAuthorById).toHaveBeenCalledWith(authorUserId);
      expect(adminAuthorsApi.listAdminAuthorBooks).toHaveBeenCalledWith(authorUserId, {
        page: 1,
        limit: 10,
      });
      expect(adminTicketsApi.listAdminTickets).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        authorId: authorUserId,
      });
    });
  });

  it('shows not found when author API returns 404', async () => {
    adminAuthorsApi.getAdminAuthorById.mockRejectedValue({
      normalized: { statusCode: 404, message: 'Author not found' },
    });

    renderAuthorDetail();
    expect(await screen.findByText(/author not found/i)).toBeInTheDocument();
  });

  it('does not expose sensitive account fields', async () => {
    adminAuthorsApi.getAdminAuthorById.mockResolvedValue({
      ...mockAuthor,
      passwordHash: 'secret',
    });

    renderAuthorDetail();
    await screen.findByRole('heading', { name: 'Priya Sharma' });
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });
});
