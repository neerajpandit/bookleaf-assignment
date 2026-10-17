import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BooksPage from './BooksPage.jsx';
import { AuthProvider } from '../../auth/context/AuthContext.jsx';
import * as authApi from '../../auth/api/authApi.js';
import * as booksApi from '../../books/api/booksApi.js';
import { mockAuthorUser } from '../../../test/helpers.jsx';
import { mockBooks } from '../../../test/fixtures.js';

vi.mock('../../auth/api/authApi.js');
vi.mock('../../books/api/booksApi.js');

function renderBooksPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <BooksPage />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('BooksPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authApi.getCurrentUser.mockResolvedValue(mockAuthorUser);
  });

  it('displays books and handles null optional values', async () => {
    booksApi.listBooks.mockResolvedValue({
      items: mockBooks,
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
    });

    renderBooksPage();

    expect((await screen.findAllByText('Whispers of the Ganges')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('submits search filters to the API', async () => {
    const user = userEvent.setup();
    booksApi.listBooks.mockResolvedValue({
      items: [mockBooks[0]],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderBooksPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/search by title/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search book titles'), {
      target: { value: 'Ganges' },
    });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    await waitFor(() => {
      expect(booksApi.listBooks).toHaveBeenCalledTimes(2);
    });

    expect(booksApi.listBooks).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'Ganges', page: 1 }),
    );
  });

  it('shows pagination metadata from the API', async () => {
    booksApi.listBooks.mockResolvedValue({
      items: mockBooks,
      pagination: { page: 1, limit: 10, total: 25, totalPages: 3 },
    });

    renderBooksPage();

    expect(await screen.findByText(/showing 1–10 of 25 books/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
  });

  it('shows an empty state when no books match', async () => {
    booksApi.listBooks.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });

    renderBooksPage();

    expect(await screen.findByText(/no books found/i)).toBeInTheDocument();
  });
});
