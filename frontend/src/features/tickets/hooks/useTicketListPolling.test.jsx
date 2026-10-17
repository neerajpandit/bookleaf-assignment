import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTicketList, useCreateTicket } from './useTickets.js';
import { ticketKeys } from '../api/ticketKeys.js';
import * as ticketsApi from '../api/ticketsApi.js';
import { mockTicket } from '../../../test/fixtures.js';
import { getListPollInterval } from '../../../lib/listPollInterval.js';
import { TICKET_POLL_INTERVAL_MS } from '../constants.js';

vi.mock('../api/ticketsApi.js');

function createWrapper(queryClient) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('author ticket list polling', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('registers list polling options on the author ticket list query', async () => {
    ticketsApi.listTickets.mockResolvedValue({
      items: [mockTicket],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const params = { page: 1, limit: 10 };

    renderHook(() => useTicketList(params), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      const query = queryClient.getQueryCache().find({ queryKey: ticketKeys.list(params) });
      expect(query).toBeTruthy();
      expect(query.options.refetchInterval).toBe(getListPollInterval);
      expect(query.options.refetchIntervalInBackground).toBe(false);
    });
  });

  it('refetches the author ticket list on the configured interval', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    ticketsApi.listTickets.mockResolvedValue({
      items: [mockTicket],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderHook(() => useTicketList({ page: 1, limit: 10 }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(ticketsApi.listTickets).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(TICKET_POLL_INTERVAL_MS);

    await waitFor(() => expect(ticketsApi.listTickets.mock.calls.length).toBeGreaterThan(1));
  });

  it('invalidates the author ticket list immediately after ticket creation', async () => {
    ticketsApi.createTicket.mockResolvedValue({
      ticket: mockTicket,
      initialMessage: { id: 'msg-1', body: 'Hello' },
    });
    ticketsApi.listTickets.mockResolvedValue({
      items: [mockTicket],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(
      () => ({
        list: useTicketList({ page: 1, limit: 10 }),
        create: useCreateTicket(),
      }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));

    await result.current.create.mutateAsync({
      subject: 'New ticket',
      description: 'Need help',
      categoryContext: 'GENERAL_ACCOUNT',
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ticketKeys.lists() }),
    );
  });
});
