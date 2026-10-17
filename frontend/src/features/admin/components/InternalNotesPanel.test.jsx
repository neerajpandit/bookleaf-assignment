import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import InternalNotesPanel from './InternalNotesPanel.jsx';

describe('InternalNotesPanel', () => {
  it('does not render pagination when there are no internal notes', () => {
    render(
      <InternalNotesPanel
        notesQuery={{
          isLoading: false,
          isError: false,
          isFetching: false,
          data: {
            items: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
          },
        }}
        onCreateNote={vi.fn()}
        isCreating={false}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
      />,
    );

    expect(screen.getByText('No internal notes yet.')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
    expect(screen.queryByText(/rows per page/i)).not.toBeInTheDocument();
  });

  it('renders pagination when internal notes exist', () => {
    render(
      <InternalNotesPanel
        notesQuery={{
          isLoading: false,
          isError: false,
          isFetching: false,
          data: {
            items: [
              {
                id: 'note-1',
                body: 'Team handoff note',
                admin: { name: 'Admin', email: 'admin@test.com' },
                createdAt: '2025-10-17T10:00:00.000Z',
              },
            ],
            pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
          },
        }}
        onCreateNote={vi.fn()}
        isCreating={false}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Team handoff note')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
    expect(screen.getByText(/showing 1/i)).toBeInTheDocument();
  });
});
