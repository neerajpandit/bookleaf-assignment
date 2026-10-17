import { useEffect, useMemo, useState } from 'react';
import LoadingIndicator from '../../../components/feedback/LoadingIndicator.jsx';
import ErrorState from '../../../components/feedback/ErrorState.jsx';
import EmptyState from '../../../components/feedback/EmptyState.jsx';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import Pagination from '../../../components/common/Pagination.jsx';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { useAdminTicketQueue } from '../hooks/useAdminTickets.js';
import { useQueueSearchParams } from '../hooks/useQueueSearchParams.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import TicketQueueFilters from '../components/TicketQueueFilters.jsx';
import TicketQueueTable from '../components/TicketQueueTable.jsx';
import { collectAssigneeOptions } from '../utils/assignees.js';
import { normalizeApiError } from '../../../lib/apiError.js';

export function AdminTicketQueuePage() {
  const { user } = useAuth();
  const { params, apiParams, setFilters, setPage, setLimit } = useQueueSearchParams(user?.id);
  const [searchInput, setSearchInput] = useState(params.search);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setSearchInput(params.search);
  }, [params.search]);

  useEffect(() => {
    if (debouncedSearch !== params.search) {
      setFilters({ search: debouncedSearch, page: 1 });
    }
  }, [debouncedSearch, params.search, setFilters]);

  const queueQuery = useAdminTicketQueue(apiParams);
  const pagination = queueQuery.data?.pagination;

  const assigneeOptions = useMemo(
    () => collectAssigneeOptions(queueQuery.data?.items, user),
    [queueQuery.data?.items, user],
  );

  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      status: '',
      category: '',
      priority: '',
      assignedTo: '',
      assignedToMe: false,
      dateFrom: '',
      dateTo: '',
      search: '',
      authorId: '',
      aiProcessingStatus: '',
      page: 1,
    });
  };

  return (
    <>
      <PageHeader
        title="Ticket queue"
        description="Filter and manage support tickets from authors."
      />

      <TicketQueueFilters
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        filters={params}
        onFilterChange={setFilters}
        assigneeOptions={assigneeOptions}
        onClearFilters={clearFilters}
      />

      <div className="mt-6">
        {queueQuery.isLoading ? (
          <LoadingIndicator label="Loading ticket queue…" />
        ) : queueQuery.isError ? (
          <ErrorState
            title="Unable to load queue"
            message={(queueQuery.error?.normalized || normalizeApiError(queueQuery.error)).message}
            onRetry={() => queueQuery.refetch()}
          />
        ) : (
          <>
            {!queueQuery.data?.items?.length ? (
              <EmptyState
                title="No tickets match these filters"
                description="Try adjusting filters or clearing the search."
              />
            ) : (
              <TicketQueueTable tickets={queueQuery.data.items} />
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
                  disabled={queueQuery.isFetching}
                  itemLabel="tickets"
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}

export default AdminTicketQueuePage;
