import { Link } from 'react-router-dom';
import { buildTicketDetailState } from '../../../lib/ticketNavigation.js';
import LoadingIndicator from '../../../components/feedback/LoadingIndicator.jsx';
import ErrorState from '../../../components/feedback/ErrorState.jsx';
import EmptyState from '../../../components/feedback/EmptyState.jsx';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import Pagination from '../../../components/common/Pagination.jsx';
import Button from '../../../components/ui/Button.jsx';
import { useTicketList } from '../hooks/useTickets.js';
import { useAuthorTicketFilters } from '../hooks/useAuthorTicketFilters.js';
import TicketList from '../components/TicketList.jsx';
import TicketListFilters from '../components/TicketListFilters.jsx';
import { normalizeApiError } from '../../../lib/apiError.js';

export function TicketsPage() {
  const {
    page,
    limit,
    filters,
    searchInput,
    apiParams,
    listSearch,
    setPage,
    setLimit,
    setFilter,
    clearFilters,
  } = useAuthorTicketFilters(10);
  const { data, isLoading, isError, error, refetch, isFetching } = useTicketList(apiParams);
  const pagination = data?.pagination;
  const hasActiveFilters = Boolean(filters.status || filters.category || filters.search);
  const createTicketState = buildTicketDetailState({ listSearch });

  return (
    <>
      <PageHeader
        title="My Tickets"
        description="Track support requests and conversations with the BookLeaf team."
        actions={
          <Link to="/author/tickets/new" state={createTicketState}>
            <Button>Create ticket</Button>
          </Link>
        }
      />

      <TicketListFilters
        searchInput={searchInput}
        filters={filters}
        onFilterChange={setFilter}
        onClearFilters={clearFilters}
      />

      <div className="mt-6">
        {isLoading ? (
          <LoadingIndicator label="Loading your tickets…" />
        ) : isError ? (
          <ErrorState
            title="Unable to load tickets"
            message={(error?.normalized || normalizeApiError(error)).message}
            onRetry={() => refetch()}
          />
        ) : (
          <>
            {!data?.items?.length ? (
              <EmptyState
                title={hasActiveFilters ? 'No tickets match your filters' : 'No support tickets yet'}
                description={
                  hasActiveFilters
                    ? 'Try adjusting or clearing your filters to see more tickets.'
                    : 'Create a ticket when you need help with royalties, production, or account questions.'
                }
                action={
                  hasActiveFilters ? (
                    <Button variant="secondary" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : (
                    <Link to="/author/tickets/new" state={createTicketState}>
                      <Button>Create your first ticket</Button>
                    </Link>
                  )
                }
              />
            ) : (
              <TicketList tickets={data.items} listSearch={listSearch} />
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

export default TicketsPage;
