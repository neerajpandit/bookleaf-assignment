import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateTicketForm from './CreateTicketForm.jsx';
import * as booksApi from '../../books/api/booksApi.js';
import { mockBooks, mockTicket } from '../../../test/fixtures.js';

vi.mock('../../books/api/booksApi.js');

function renderForm(props = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CreateTicketForm onSubmit={props.onSubmit || vi.fn()} isSubmitting={false} {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CreateTicketForm', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    booksApi.fetchAllBooks.mockResolvedValue(mockBooks);
  });

  it('clears the book selector when General / Account Level is selected', async () => {
    const user = userEvent.setup();
    renderForm();

    await waitFor(() => {
      expect(screen.getByLabelText(/^book$/i)).toBeEnabled();
    });

    const bookSelect = screen.getByLabelText(/^book$/i);
    await user.selectOptions(bookSelect, 'BK001');
    expect(bookSelect).toHaveValue('BK001');

    await user.click(screen.getByLabelText(/general \/ account level/i));

    expect(bookSelect).toHaveValue('');
    expect(bookSelect).toBeDisabled();
  });

  it('requires a book for book-specific tickets', async () => {
    const user = userEvent.setup();
    renderForm();

    await waitFor(() => {
      expect(screen.getByLabelText(/^book$/i)).toBeEnabled();
    });

    await user.type(screen.getByLabelText(/subject/i), 'Need help');
    await user.type(screen.getByLabelText(/description/i), 'Please review my royalties.');
    await user.click(screen.getByRole('button', { name: /submit ticket/i }));

    expect(await screen.findByText(/please select a book/i)).toBeInTheDocument();
  });

  it('shows the returned ticket number after successful creation', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ ticket: mockTicket, initialMessage: null });

    renderForm({ onSubmit });

    await waitFor(() => {
      expect(screen.getByLabelText(/^book$/i)).toBeEnabled();
    });

    await user.selectOptions(screen.getByLabelText(/^book$/i), 'BK001');
    await user.type(screen.getByLabelText(/subject/i), 'Royalty payout question');
    await user.type(screen.getByLabelText(/description/i), 'When will my pending royalties be processed?');
    await user.click(screen.getByRole('button', { name: /submit ticket/i }));

    expect(await screen.findByText(/TKT-1001/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view ticket/i })).toHaveAttribute(
      'href',
      `/author/tickets/${mockTicket.id}`,
    );
  });

  it('displays server validation errors', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue({
      normalized: {
        isValidationError: true,
        message: 'Validation failed',
        details: [{ field: 'subject', message: 'Subject is required' }],
      },
    });

    renderForm({ onSubmit });

    await waitFor(() => {
      expect(screen.getByLabelText(/^book$/i)).toBeEnabled();
    });

    await user.selectOptions(screen.getByLabelText(/^book$/i), 'BK001');
    await user.type(screen.getByLabelText(/description/i), 'Details here');
    await user.click(screen.getByRole('button', { name: /submit ticket/i }));

    expect(await screen.findByText('Subject is required')).toBeInTheDocument();
  });

  it('shows selected attachment filename and size', async () => {
    const user = userEvent.setup();
    renderForm();

    await waitFor(() => {
      expect(screen.getByLabelText(/attachment/i)).toBeInTheDocument();
    });

    const file = new File(['%PDF-1.4'], 'evidence.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText(/attachment/i), file);

    expect(screen.getByText('evidence.pdf')).toBeInTheDocument();
    expect(screen.getByText(/8 B/)).toBeInTheDocument();
  });

  it('allows removing a selected attachment before submit', async () => {
    const user = userEvent.setup();
    renderForm();

    await waitFor(() => {
      expect(screen.getByLabelText(/attachment/i)).toBeInTheDocument();
    });

    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    await user.upload(screen.getByLabelText(/attachment/i), file);
    expect(screen.getByText('notes.txt')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /remove/i }));
    expect(screen.queryByText('notes.txt')).not.toBeInTheDocument();
  });

  it('submits multipart payload when an attachment is selected', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({
      ticket: { ...mockTicket, attachment: { originalFilename: 'evidence.pdf' } },
      initialMessage: null,
    });

    renderForm({ onSubmit });

    await waitFor(() => {
      expect(screen.getByLabelText(/^book$/i)).toBeEnabled();
    });

    await user.selectOptions(screen.getByLabelText(/^book$/i), 'BK001');
    await user.type(screen.getByLabelText(/subject/i), 'Evidence attached');
    await user.type(screen.getByLabelText(/description/i), 'See attached file.');
    await user.upload(
      screen.getByLabelText(/attachment/i),
      new File(['%PDF-1.4'], 'evidence.pdf', { type: 'application/pdf' }),
    );
    await user.click(screen.getByRole('button', { name: /submit ticket/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Evidence attached',
          bookId: 'BK001',
          attachmentFile: expect.any(File),
        }),
      );
    });
  });

  it('prevents duplicate submission while submitting', async () => {
    const onSubmit = vi.fn(() => new Promise(() => {}));

    renderForm({ onSubmit, isSubmitting: true });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /please wait/i })).toBeDisabled();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
