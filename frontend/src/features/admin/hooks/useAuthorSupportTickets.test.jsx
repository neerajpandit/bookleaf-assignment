import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthorSupportTickets } from './useAuthorSupportTickets.js';
import * as adminTicketsApi from '../api/adminTicketsApi.js';

vi.mock('../api/adminTicketsApi.js');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useAuthorSupportTickets', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('loads tickets using the admin queue authorId filter', async () => {
    adminTicketsApi.listAdminTickets.mockResolvedValue({
      items: [{ id: '1', subject: 'Test ticket' }],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    });

    const { result } = renderHook(
      () => useAuthorSupportTickets('665f1c2d3a4b5c6d7e8f9012'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(adminTicketsApi.listAdminTickets).toHaveBeenCalledWith(
      expect.objectContaining({ authorId: '665f1c2d3a4b5c6d7e8f9012' }),
    );
    expect(result.current.data.items).toHaveLength(1);
  });
});
