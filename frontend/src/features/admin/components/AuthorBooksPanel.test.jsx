import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthorBooksPanel from './AuthorBooksPanel.jsx';

describe('AuthorBooksPanel', () => {
  it('calls filter change handlers for status and search', async () => {
    const user = userEvent.setup();
    const onBookFiltersChange = vi.fn();

    render(
      <AuthorBooksPanel
        booksQuery={{
          isLoading: false,
          isError: false,
          data: { items: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } },
        }}
        bookFilters={{ status: '', search: '' }}
        onBookFiltersChange={onBookFiltersChange}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/^status$/i), 'Published & Live');
    expect(onBookFiltersChange).toHaveBeenCalledWith({ status: 'Published & Live' });
  });
});
