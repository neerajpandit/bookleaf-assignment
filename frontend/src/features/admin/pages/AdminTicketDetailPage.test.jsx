import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminTicketDetailPage from './AdminTicketDetailPage.jsx';
import { AuthProvider } from '../../auth/context/AuthContext.jsx';
import * as authApi from '../../auth/api/authApi.js';
import * as adminTicketsApi from '../api/adminTicketsApi.js';
import {
  mockAdminUser,
  mockAdminTicketDetail,
  mockAdminInternalNote,
} from '../../../test/fixtures.js';
import { TICKET_POLL_INTERVAL_MS } from '../../tickets/constants.js';

vi.mock('../../auth/api/authApi.js');
vi.mock('../api/adminTicketsApi.js');

function renderDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/admin/tickets/507f1f77bcf86cd799439011']}>
          <Routes>
            <Route path="/admin/tickets/:ticketId" element={<AdminTicketDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AdminTicketDetailPage', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.resetAllMocks();
    authApi.getCurrentUser.mockResolvedValue(mockAdminUser);
    adminTicketsApi.getAdminTicketById.mockResolvedValue(mockAdminTicketDetail);
    adminTicketsApi.listAdminTicketMessages.mockResolvedValue({
      items: [
        {
          id: 'msg-1',
          body: 'Author question',
          senderRole: 'AUTHOR',
          senderName: 'Test Author',
          createdAt: '2025-10-17T09:00:00.000Z',
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    });
    adminTicketsApi.listAdminInternalNotes.mockResolvedValue({
      items: [mockAdminInternalNote],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    });
  });

  it('links to the author profile from the ticket header', async () => {
    renderDetail();

    expect(await screen.findByRole('link', { name: /view author profile/i })).toHaveAttribute(
      'href',
      `/admin/authors/${mockAdminTicketDetail.author.id}`,
    );
  });

  it('renders public messages and private notes separately', async () => {
    renderDetail();

    expect(await screen.findByText('Author question')).toBeInTheDocument();
    expect(screen.getByText('Private internal notes')).toBeInTheDocument();
    expect(screen.getByText('Private admin note for team only')).toBeInTheDocument();
    expect(screen.queryByText('Private admin note for team only', { selector: '[aria-label="Ticket conversation"] *' })).not.toBeInTheDocument();
  });

  it('submits public replies through the public message API', async () => {
    const user = userEvent.setup();
    adminTicketsApi.sendAdminPublicReply.mockResolvedValue({
      message: { id: 'msg-2', body: 'Admin reply', senderRole: 'ADMIN' },
      lastMessageAt: '2025-10-17T11:00:00.000Z',
    });

    renderDetail();

    await waitFor(() => {
      expect(screen.getByLabelText(/public reply to author/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/public reply to author/i), 'Admin reply');
    await user.click(screen.getByRole('button', { name: /send public reply/i }));

    await waitFor(() => {
      expect(adminTicketsApi.sendAdminPublicReply).toHaveBeenCalledWith(
        mockAdminTicketDetail.id,
        'Admin reply',
      );
    });
  });

  it('creates internal notes through the notes API only', async () => {
    const user = userEvent.setup();
    adminTicketsApi.createAdminInternalNote.mockResolvedValue(mockAdminInternalNote);

    renderDetail();

    await waitFor(() => {
      expect(screen.getByLabelText(/add private note/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/add private note/i), 'New private note');
    await user.click(screen.getByRole('button', { name: /save private note/i }));

    await waitFor(() => {
      expect(adminTicketsApi.createAdminInternalNote).toHaveBeenCalledWith(
        mockAdminTicketDetail.id,
        'New private note',
      );
    });
    expect(adminTicketsApi.sendAdminPublicReply).not.toHaveBeenCalled();
  });

  it('does not auto-publish AI drafts while editing', async () => {
    const user = userEvent.setup();
    renderDetail();

    const draftEditor = await screen.findByLabelText(/ai-generated draft/i);
    await user.clear(draftEditor);
    await user.type(draftEditor, 'Edited draft text');

    expect(adminTicketsApi.sendAdminPublicReply).not.toHaveBeenCalled();
  });

  it('sends approved AI draft through the public reply API', async () => {
    const user = userEvent.setup();
    adminTicketsApi.sendAdminPublicReply.mockResolvedValue({
      message: { id: 'msg-ai', body: 'Approved draft', senderRole: 'ADMIN' },
      lastMessageAt: '2025-10-17T11:00:00.000Z',
    });

    renderDetail();

    await waitFor(() => {
      expect(screen.getByLabelText(/ai-generated draft/i)).toHaveValue(
        mockAdminTicketDetail.aiDraftResponse,
      );
    });

    await user.click(screen.getByRole('button', { name: /send approved draft/i }));

    await waitFor(() => {
      expect(adminTicketsApi.sendAdminPublicReply).toHaveBeenCalledWith(
        mockAdminTicketDetail.id,
        mockAdminTicketDetail.aiDraftResponse,
      );
    });
  });

  it('refreshes conversation and ticket detail after a successful approved draft send', async () => {
    const user = userEvent.setup();
    adminTicketsApi.sendAdminPublicReply.mockResolvedValue({
      message: { id: 'msg-ai', body: 'Approved draft', senderRole: 'ADMIN' },
      lastMessageAt: '2025-10-17T11:00:00.000Z',
    });

    renderDetail();

    await waitFor(() => {
      expect(adminTicketsApi.getAdminTicketById).toHaveBeenCalledTimes(1);
      expect(adminTicketsApi.listAdminTicketMessages).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText(/ai-generated draft/i)).toHaveValue(
        mockAdminTicketDetail.aiDraftResponse,
      );
    });

    await user.click(screen.getByRole('button', { name: /send approved draft/i }));

    await waitFor(() => {
      expect(adminTicketsApi.getAdminTicketById.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(adminTicketsApi.listAdminTicketMessages.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('allows manual replies when AI analysis failed', async () => {
    adminTicketsApi.getAdminTicketById.mockResolvedValue({
      ...mockAdminTicketDetail,
      aiProcessingStatus: 'FAILED',
      aiError: 'Provider timeout',
      aiDraftResponse: null,
    });

    renderDetail();

    expect(await screen.findByLabelText(/public reply to author/i)).toBeEnabled();
    expect(screen.getByText(/analysis note/i)).toBeInTheDocument();
  });

  it('updates assignment via assignment endpoint', async () => {
    const user = userEvent.setup();
    adminTicketsApi.updateTicketAssignment.mockResolvedValue({
      ...mockAdminTicketDetail,
      assignedAdmin: { id: mockAdminUser.id, name: 'Test Admin', email: mockAdminUser.email },
    });

    renderDetail();

    await waitFor(() => {
      expect(screen.getByLabelText(/assign to/i)).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText(/assign to/i), mockAdminUser.id);
    await user.click(screen.getByRole('button', { name: /update assignment/i }));

    await waitFor(() => {
      expect(adminTicketsApi.updateTicketAssignment).toHaveBeenCalledWith(
        mockAdminTicketDetail.id,
        mockAdminUser.id,
      );
    });
  });

  it('polls conversation messages while mounted and stops after unmount', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });

    const { unmount } = renderDetail();

    await waitFor(() => {
      expect(adminTicketsApi.listAdminTicketMessages).toHaveBeenCalledTimes(1);
    });

    vi.advanceTimersByTime(TICKET_POLL_INTERVAL_MS);

    await waitFor(() => {
      expect(adminTicketsApi.listAdminTicketMessages.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    unmount();
    const callsBefore = adminTicketsApi.listAdminTicketMessages.mock.calls.length;

    vi.advanceTimersByTime(TICKET_POLL_INTERVAL_MS * 2);

    expect(adminTicketsApi.listAdminTicketMessages.mock.calls.length).toBe(callsBefore);
  });

  it('handles status mutation errors', async () => {
    const user = userEvent.setup();
    adminTicketsApi.updateTicketStatus.mockRejectedValue({
      normalized: { message: 'Invalid status transition from CLOSED to OPEN' },
    });

    adminTicketsApi.getAdminTicketById.mockResolvedValue({
      ...mockAdminTicketDetail,
      status: 'OPEN',
    });

    renderDetail();

    await waitFor(() => {
      expect(screen.getByLabelText(/change to/i)).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText(/change to/i), 'IN_PROGRESS');
    await user.click(screen.getByRole('button', { name: /update status/i }));

    expect(await screen.findByText(/invalid status transition/i)).toBeInTheDocument();
  });
});
