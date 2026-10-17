import { useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingIndicator from '../../../components/feedback/LoadingIndicator.jsx';
import ErrorState from '../../../components/feedback/ErrorState.jsx';
import EmptyState from '../../../components/feedback/EmptyState.jsx';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import Pagination from '../../../components/common/Pagination.jsx';
import Button from '../../../components/ui/Button.jsx';
import { usePaginationState } from '../../../hooks/usePaginationState.js';
import { useBooks } from '../hooks/useBooks.js';
import BookFilters from '../components/BookFilters.jsx';
import BookList from '../components/BookList.jsx';
import { normalizeApiError } from '../../../lib/apiError.js';

export function BooksPage() {
  const { page, limit, setPage, setLimit, resetPage } = usePaginationState(10);
  const [searchInput, setSearchInput] = useState('');
  const [statusInput, setStatusInput] = useState('');
  const [filters, setFilters] = useState({ search: '', status: '' });

  const queryParams = {
    page,
    limit,
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useBooks(queryParams);
  const pagination = data?.pagination;

  const applyFilters = () => {
    resetPage();
    setFilters({ search: searchInput.trim(), status: statusInput });
  };

  return (
    <>
      <PageHeader
        title="My Books"
        description="Your published titles and books currently in production."
        actions={
          <Link to="/author/tickets/new">
            <Button variant="secondary">Raise a book issue</Button>
          </Link>
        }
      />

      <BookFilters
        search={searchInput}
        status={statusInput}
        onSearchChange={setSearchInput}
        onStatusChange={setStatusInput}
        onSubmit={applyFilters}
        isLoading={isFetching}
      />

      <div className="mt-6">
        {isLoading ? (
          <LoadingIndicator label="Loading your books…" />
        ) : isError ? (
          <ErrorState
            title="Unable to load books"
            message={(error?.normalized || normalizeApiError(error)).message}
            onRetry={() => refetch()}
          />
        ) : (
          <>
            {!data?.items?.length ? (
              <EmptyState
                title="No books found"
                description={
                  filters.search || filters.status
                    ? 'Try adjusting your search or status filter.'
                    : 'Books assigned to your account will appear here.'
                }
              />
            ) : (
              <BookList books={data.items} />
            )}

            {pagination ? (
              <div className="mt-4">
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  limit={pagination.limit}
                  onPageChange={setPage}
                  onLimitChange={setLimit}
                  disabled={isFetching}
                  itemLabel="books"
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}

export default BooksPage;
