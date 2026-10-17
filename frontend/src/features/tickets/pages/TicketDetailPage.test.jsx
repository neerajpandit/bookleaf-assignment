import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TicketDetailPage from './TicketDetailPage.jsx';
import { AuthProvider } from '../../auth/context/AuthContext.jsx';
import * as authApi from '../../auth/api/authApi.js';
import * as ticketsApi from '../api/ticketsApi.js';
import {
  mockAuthorUser,
  mockTicketDetail,
  mockClosedTicketDetail,
  forbiddenTicketFields,
} from '../../../test/fixtures.js';
import { TICKET_POLL_INTERVAL_MS } from '../constants.js';

vi.mock('../../auth/api/authApi.js');
vi.mock('../api/ticketsApi.js');

function renderTicketDetail(ticketId = mockTicketDetail.id, { initialEntry } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const entry = initialEntry ?? {
    pathname: `/author/tickets/${ticketId}`,
    state: undefined,
  };

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={[entry]}>
            <Routes>
              <Route path="/author/tickets/:ticketId" element={<TicketDetailPage />} />
              <Route path="/author/tickets" element={<div>Tickets list</div>} />
              <Route path="/author" element={<div>Author dashboard</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>,
    ),
  };
}

describe('TicketDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authApi.getCurrentUser.mockResolvedValue(mockAuthorUser);
    ticketsApi.getTicketById.mockResolvedValue(mockTicketDetail);
    ticketsApi.addTicketMessage.mockResolvedValue({
      message: {
        id: 'msg-3',
        body: 'Thanks for the update.',
        senderRole: 'AUTHOR',
        senderName: 'Test Author',
        createdAt: '2025-10-17T11:00:00.000Z',
      },
      lastMessageAt: '2025-10-17T11:00:00.000Z',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays public conversation messages only', async () => {
    renderTicketDetail();

    expect(
      (await screen.findAllByText('When will my pending royalties be processed?')).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('We are reviewing your payout schedule.')).toBeInTheDocument();
    expect(screen.queryByText(forbiddenTicketFields.privateNote)).not.toBeInTheDocument();
    expect(screen.queryByText(forbiddenTicketFields.aiDraftResponse)).not.toBeInTheDocument();
  });

  it('disables the composer for closed tickets', async () => {
    ticketsApi.getTicketById.mockResolvedValue(mockClosedTicketDetail);

    renderTicketDetail();

    expect(await screen.findByText(/this ticket is closed/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/follow-up message/i)).not.toBeInTheDocument();
  });

  it('submits follow-up messages and refreshes the conversation', async () => {
    const user = userEvent.setup();
    renderTicketDetail();

    await waitFor(() => {
      expect(screen.getByLabelText(/follow-up message/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/follow-up message/i), 'Thanks for the update.');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(ticketsApi.addTicketMessage).toHaveBeenCalledWith(
        mockTicketDetail.id,
        'Thanks for the update.',
      );
    });

    expect(await screen.findByText(/your message was sent/i)).toBeInTheDocument();
  });

  it('preserves unsent composer text when ticket data refreshes', async () => {
    const user = userEvent.setup();
    const { queryClient } = renderTicketDetail();

    const textarea = await screen.findByLabelText(/follow-up message/i);
    await user.type(textarea, 'Draft reply in progress');

    ticketsApi.getTicketById.mockResolvedValue({
      ...mockTicketDetail,
      messages: [
        ...mockTicketDetail.messages,
        {
          id: 'msg-new',
          body: 'New admin reply from polling',
          senderRole: 'ADMIN',
          senderName: 'Support Admin',
          createdAt: '2025-10-17T10:30:00.000Z',
        },
      ],
    });

    await queryClient.invalidateQueries();

    await waitFor(() => {
      expect(screen.getByText('New admin reply from polling')).toBeInTheDocument();
    });

    expect(textarea).toHaveValue('Draft reply in progress');
  });

  it('polls while mounted and stops after unmount', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });

    const { unmount } = renderTicketDetail();

    await waitFor(() => {
      expect(ticketsApi.getTicketById).toHaveBeenCalledTimes(1);
    });

    vi.advanceTimersByTime(TICKET_POLL_INTERVAL_MS);

    await waitFor(() => {
      expect(ticketsApi.getTicketById.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    unmount();
    const callsBefore = ticketsApi.getTicketById.mock.calls.length;

    vi.advanceTimersByTime(TICKET_POLL_INTERVAL_MS * 2);

    expect(ticketsApi.getTicketById.mock.calls.length).toBe(callsBefore);
  });

  it('does not expose AI review UI to authors', async () => {
    ticketsApi.getTicketById.mockResolvedValue({
      ...mockTicketDetail,
      aiDraftResponse: forbiddenTicketFields.aiDraftResponse,
      aiProcessingStatus: 'COMPLETED',
    });

    renderTicketDetail();

    await waitFor(() => {
      expect(screen.getByText('Royalty payout question')).toBeInTheDocument();
    });

    expect(screen.queryByLabelText(/ai analysis review/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/ai-generated draft/i)).not.toBeInTheDocument();
    expect(screen.queryByText(forbiddenTicketFields.aiDraftResponse)).not.toBeInTheDocument();
  });

  it('uses dashboard back navigation when opened from the author dashboard', async () => {
    renderTicketDetail(mockTicketDetail.id, {
      initialEntry: {
        pathname: `/author/tickets/${mockTicketDetail.id}`,
        state: { ticketOrigin: 'dashboard' },
      },
    });

    expect(await screen.findByRole('link', { name: /back to dashboard/i })).toHaveAttribute(
      'href',
      '/author',
    );
    expect(screen.getByRole('link', { name: /back to dashboard/i })).toHaveTextContent('Back');
  });

  it('preserves ticket list filters in the back link when provided', async () => {
    renderTicketDetail(mockTicketDetail.id, {
      initialEntry: {
        pathname: `/author/tickets/${mockTicketDetail.id}`,
        state: { listSearch: '?status=OPEN&page=2' },
      },
    });

    expect(await screen.findByRole('link', { name: /back to tickets/i })).toHaveAttribute(
      'href',
      '/author/tickets?status=OPEN&page=2',
    );
  });

  it('falls back to the ticket list when opened directly without navigation state', async () => {
    renderTicketDetail();

    expect(await screen.findByRole('link', { name: /back to tickets/i })).toHaveAttribute(
      'href',
      '/author/tickets',
    );
  });

  it('shows a safe not-found message for inaccessible tickets', async () => {
    ticketsApi.getTicketById.mockRejectedValue({
      normalized: { statusCode: 404, message: 'Ticket not found' },
    });

    renderTicketDetail('507f1f77bcf86cd799439099');

    expect(await screen.findByText(/ticket unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/could not be found or is not available/i)).toBeInTheDocument();
  });
});
