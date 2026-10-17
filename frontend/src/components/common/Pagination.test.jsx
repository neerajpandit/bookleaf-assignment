import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './Pagination.jsx';

describe('Pagination', () => {
  it('renders summary, page-size control, and page buttons', () => {
    render(
      <Pagination
        page={2}
        totalPages={5}
        total={100}
        limit={20}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
        itemLabel="books"
      />,
    );

    expect(screen.getByText(/showing 21–40 of 100 books/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rows per page/i)).toHaveValue('20');
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
    expect(screen.getByLabelText(/page number/i)).toHaveValue(2);
  });

  it('changes page size and resets via callback', async () => {
    const user = userEvent.setup();
    const onLimitChange = vi.fn();

    render(
      <Pagination
        page={1}
        totalPages={3}
        total={60}
        limit={20}
        onPageChange={vi.fn()}
        onLimitChange={onLimitChange}
        itemLabel="tickets"
      />,
    );

    await user.selectOptions(screen.getByLabelText(/rows per page/i), '50');
    expect(onLimitChange).toHaveBeenCalledWith(50);
  });

  it('shows a compact single-page layout without navigation controls', () => {
    render(
      <Pagination
        page={1}
        totalPages={1}
        total={1}
        limit={20}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
        itemLabel="tickets"
      />,
    );

    expect(screen.getByText(/showing 1–1 of 1 tickets/i)).toBeInTheDocument();
    expect(screen.getByText(/page 1 of 1/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/page number/i)).not.toBeInTheDocument();
  });

  it('submits a direct page number', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(
      <Pagination
        page={1}
        totalPages={10}
        total={100}
        limit={10}
        onPageChange={onPageChange}
        onLimitChange={vi.fn()}
        itemLabel="authors"
      />,
    );

    await user.clear(screen.getByLabelText(/page number/i));
    await user.type(screen.getByLabelText(/page number/i), '4');
    await user.click(screen.getByRole('button', { name: /go/i }));

    expect(onPageChange).toHaveBeenCalledWith(4);
  });
});
