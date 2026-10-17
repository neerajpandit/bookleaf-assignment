import { useEffect, useState } from 'react';
import LoadingIndicator from '../../../components/feedback/LoadingIndicator.jsx';
import ErrorState from '../../../components/feedback/ErrorState.jsx';
import EmptyState from '../../../components/feedback/EmptyState.jsx';
import Pagination from '../../../components/common/Pagination.jsx';
import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import Button from '../../../components/ui/Button.jsx';
import { BookList } from '../../books/components/BookList.jsx';
import { normalizeApiError } from '../../../lib/apiError.js';
import { BOOK_STATUS_VALUES } from '../../../lib/constants/bookStatus.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';

export function AuthorBooksPanel({
  booksQuery,
  bookFilters,
  onBookFiltersChange,
  onPageChange,
  onLimitChange,
}) {
  const [searchInput, setSearchInput] = useState(bookFilters.search || '');
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setSearchInput(bookFilters.search || '');
  }, [bookFilters.search]);

  useEffect(() => {
    if (debouncedSearch !== bookFilters.search) {
      onBookFiltersChange({ search: debouncedSearch });
    }
  }, [debouncedSearch, bookFilters.search, onBookFiltersChange]);

  const hasActiveFilters = Boolean(bookFilters.status || bookFilters.search);

  return (
    <section aria-label="Author books" className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Author&apos;s books</h2>
      <p className="mt-1 text-xs text-slate-500">
        Financial values are returned as stored by the backend and are not recalculated in the UI.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="author-books-search" className="mb-1 block text-sm font-medium text-slate-700">
            Search title
          </label>
          <Input
            id="author-books-search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Book title"
          />
        </div>
        <div>
          <label htmlFor="author-books-status" className="mb-1 block text-sm font-medium text-slate-700">
            Status
          </label>
          <Select
            id="author-books-status"
            value={bookFilters.status}
            onChange={(event) => onBookFiltersChange({ status: event.target.value })}
          >
            <option value="">All statuses</option>
            {BOOK_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Button
          variant="ghost"
          onClick={() => {
            setSearchInput('');
            onBookFiltersChange({ status: '', search: '' });
          }}
        >
          Clear filters
        </Button>
      </div>

      <div className="mt-4">
        {booksQuery.isLoading ? (
          <LoadingIndicator label="Loading books…" />
        ) : booksQuery.isError ? (
          <ErrorState
            title="Unable to load books"
            message={(booksQuery.error?.normalized || normalizeApiError(booksQuery.error)).message}
            onRetry={() => booksQuery.refetch()}
          />
        ) : (
          <>
            {!booksQuery.data?.items?.length ? (
              <EmptyState
                title={hasActiveFilters ? 'No books match your filters' : 'No books found'}
                description={
                  hasActiveFilters
                    ? 'Try adjusting or clearing your filters.'
                    : 'This author has no books in the catalogue.'
                }
              />
            ) : (
              <BookList books={booksQuery.data.items} />
            )}
            {booksQuery.data?.pagination ? (
              <div className="mt-4">
                <Pagination
                  page={booksQuery.data.pagination.page}
                  totalPages={booksQuery.data.pagination.totalPages}
                  total={booksQuery.data.pagination.total}
                  limit={booksQuery.data.pagination.limit}
                  onPageChange={onPageChange}
                  onLimitChange={onLimitChange}
                  disabled={booksQuery.isFetching}
                  itemLabel="books"
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

export default AuthorBooksPanel;
