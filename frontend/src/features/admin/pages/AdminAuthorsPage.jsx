import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import Input from '../../../components/ui/Input.jsx';
import Button from '../../../components/ui/Button.jsx';
import LoadingIndicator from '../../../components/feedback/LoadingIndicator.jsx';
import ErrorState from '../../../components/feedback/ErrorState.jsx';
import EmptyState from '../../../components/feedback/EmptyState.jsx';
import Pagination from '../../../components/common/Pagination.jsx';
import { usePaginationState } from '../../../hooks/usePaginationState.js';
import { normalizeApiError } from '../../../lib/apiError.js';
import { useAdminAuthorDirectory } from '../hooks/useAdminAuthors.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import AuthorsTable from '../components/AuthorsTable.jsx';

export function AdminAuthorsPage() {
  const [searchInput, setSearchInput] = useState('');
  const { page, limit, setPage, setLimit, resetPage } = usePaginationState(20);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    resetPage();
  }, [debouncedSearch, resetPage]);

  const directoryQuery = useAdminAuthorDirectory({
    page,
    limit,
    search: debouncedSearch || undefined,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  const pagination = directoryQuery.data?.pagination;
  const totalAuthors = pagination?.total;
  const listSearch = useMemo(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (limit !== 20) params.set('limit', String(limit));
    if (debouncedSearch) params.set('search', debouncedSearch);
    const query = params.toString();
    return query ? `?${query}` : '';
  }, [page, limit, debouncedSearch]);

  return (
    <>
      <PageHeader
        title="All Authors"
        description="Directory of BookLeaf authors with book and ticket counts from the admin authors API."
        actions={
          <Button variant="secondary" onClick={() => directoryQuery.refetch()} isLoading={directoryQuery.isFetching}>
            Refresh
          </Button>
        }
      />

      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="flex-1">
            <label htmlFor="author-directory-search" className="mb-1 block text-sm font-medium text-slate-700">
              Search authors
            </label>
            <Input
              id="author-directory-search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Name, email, or author ID (e.g. AUTH001)"
            />
          </div>
        </form>
        {typeof totalAuthors === 'number' ? (
          <p className="mt-3 text-sm text-slate-600">
            {totalAuthors} author{totalAuthors === 1 ? '' : 's'} found
          </p>
        ) : null}
      </div>

      {directoryQuery.isLoading ? (
        <LoadingIndicator label="Loading authors…" />
      ) : directoryQuery.isError ? (
        <ErrorState
          title="Unable to load authors"
          message={(directoryQuery.error?.normalized || normalizeApiError(directoryQuery.error)).message}
          onRetry={() => directoryQuery.refetch()}
        />
      ) : (
        <>
          {!directoryQuery.data?.items?.length ? (
            <EmptyState
              title="No authors match your search"
              description="Try a different search term or clear the search field."
            />
          ) : (
            <AuthorsTable authors={directoryQuery.data.items} listSearch={listSearch} />
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
                disabled={directoryQuery.isFetching}
                itemLabel="authors"
              />
            </div>
          ) : null}
        </>
      )}
    </>
  );
}

export default AdminAuthorsPage;
