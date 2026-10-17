import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdminTicketQueue } from './useAdminTickets.js';
import { useAdminDashboardSections } from './useAdminDashboardSections.js';
import { adminKeys } from '../api/adminKeys.js';
import * as adminTicketsApi from '../api/adminTicketsApi.js';
import { mockAdminTicket } from '../../../test/fixtures.js';
import { getListPollInterval } from '../../../lib/listPollInterval.js';
import { TICKET_POLL_INTERVAL_MS } from '../../tickets/constants.js';

vi.mock('../api/adminTicketsApi.js');

function createWrapper(queryClient) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('admin list polling hooks', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('registers list polling options on the admin ticket queue query', async () => {
    adminTicketsApi.listAdminTickets.mockResolvedValue({
      items: [mockAdminTicket],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const params = { page: 1, limit: 20 };

    renderHook(() => useAdminTicketQueue(params), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      const query = queryClient.getQueryCache().find({ queryKey: adminKeys.queue(params) });
      expect(query).toBeTruthy();
      expect(query.options.refetchInterval).toBe(getListPollInterval);
      expect(query.options.refetchIntervalInBackground).toBe(false);
    });
  });

  it('registers list polling options on dashboard section queries', async () => {
    adminTicketsApi.getAdminDashboardTicketSections.mockResolvedValue({
      urgent: [],
      oldestUnresolved: [],
      recentlyUpdated: [],
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderHook(() => useAdminDashboardSections(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      const query = queryClient
        .getQueryCache()
        .find({ queryKey: adminKeys.dashboardSections({ limit: 5 }) });
      expect(query).toBeTruthy();
      expect(query.options.refetchInterval).toBe(getListPollInterval);
      expect(query.options.refetchIntervalInBackground).toBe(false);
    });
  });

  it('refetches the admin ticket queue on the configured interval', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    adminTicketsApi.listAdminTickets.mockResolvedValue({
      items: [mockAdminTicket],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderHook(() => useAdminTicketQueue({ page: 1, limit: 20 }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(adminTicketsApi.listAdminTickets).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(TICKET_POLL_INTERVAL_MS);

    await waitFor(() => expect(adminTicketsApi.listAdminTickets.mock.calls.length).toBeGreaterThan(1));
  });

  it('keeps the last successful queue data available after a polling failure', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    adminTicketsApi.listAdminTickets
      .mockResolvedValueOnce({
        items: [mockAdminTicket],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      })
      .mockRejectedValueOnce(new Error('Network error'));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(
      () => useAdminTicketQueue({ page: 1, limit: 20 }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.data?.items).toHaveLength(1));

    await vi.advanceTimersByTimeAsync(TICKET_POLL_INTERVAL_MS);

    await waitFor(() => expect(adminTicketsApi.listAdminTickets.mock.calls.length).toBeGreaterThan(1));
    expect(result.current.data.items).toHaveLength(1);
    expect(result.current.isLoading).toBe(false);
  });

  it('stops queue polling after the hook unmounts', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    adminTicketsApi.listAdminTickets.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { unmount } = renderHook(
      () => useAdminTicketQueue({ page: 1, limit: 20 }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(adminTicketsApi.listAdminTickets).toHaveBeenCalledTimes(1));
    unmount();

    const callsBefore = adminTicketsApi.listAdminTickets.mock.calls.length;
    await vi.advanceTimersByTimeAsync(TICKET_POLL_INTERVAL_MS * 3);
    expect(adminTicketsApi.listAdminTickets.mock.calls.length).toBe(callsBefore);
  });
});
