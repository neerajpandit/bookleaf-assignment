import { Link } from 'react-router-dom';
import LoadingIndicator from '../../../components/feedback/LoadingIndicator.jsx';
import ErrorState from '../../../components/feedback/ErrorState.jsx';
import EmptyState from '../../../components/feedback/EmptyState.jsx';
import Pagination from '../../../components/common/Pagination.jsx';
import TicketConversationButton from '../../../components/common/TicketConversationButton.jsx';
import { TicketStatusBadge, PriorityBadge } from '../../../components/common/StatusBadge.jsx';
import { formatDateTime } from '../../../lib/format.js';
import { normalizeApiError } from '../../../lib/apiError.js';
import { buildTicketDetailState } from '../../../lib/ticketNavigation.js';

export function AuthorTicketsPanel({ ticketsQuery, authorUserId, onPageChange, onLimitChange }) {
  return (
    <section aria-label="Author support tickets" className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Support tickets</h2>
          <p className="mt-1 text-xs text-slate-500">
            Tickets scoped to this author via the admin queue author filter.
          </p>
        </div>
        {authorUserId ? (
          <Link
            to={`/admin/tickets?authorId=${authorUserId}`}
            className="text-xs font-medium text-emerald-800 hover:underline"
          >
            Open in ticket queue
          </Link>
        ) : null}
      </div>

      <div className="mt-4">
        {ticketsQuery.isLoading ? (
          <LoadingIndicator label="Loading author tickets…" />
        ) : ticketsQuery.isError ? (
          <ErrorState
            title="Unable to load tickets"
            message={(ticketsQuery.error?.normalized || normalizeApiError(ticketsQuery.error)).message}
            onRetry={() => ticketsQuery.refetch()}
          />
        ) : (
          <>
            {!ticketsQuery.data?.items?.length ? (
              <EmptyState
                title="No tickets found for this author"
                description="This author has not created any support tickets yet."
              />
            ) : (
              <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                {ticketsQuery.data.items.map((ticket) => {
                  const detailState = buildTicketDetailState({
                    origin: 'author-profile',
                    authorId: authorUserId,
                  });

                  return (
                  <li key={ticket.id} className="px-3 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/admin/tickets/${ticket.id}`}
                          state={detailState}
                          className="font-medium text-emerald-800 hover:underline"
                        >
                          {ticket.subject}
                        </Link>
                        <p className="text-xs text-slate-500">{ticket.ticketNumber}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-2">
                          <PriorityBadge priority={ticket.priority} />
                          <TicketStatusBadge status={ticket.status} />
                        </div>
                        <TicketConversationButton
                          to={`/admin/tickets/${ticket.id}`}
                          state={detailState}
                          ticketNumber={ticket.ticketNumber}
                        />
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {ticket.category || 'Pending'} · Created {formatDateTime(ticket.createdAt)} · Updated{' '}
                      {formatDateTime(ticket.lastMessageAt)}
                    </p>
                  </li>
                  );
                })}
              </ul>
            )}
            {ticketsQuery.data?.pagination ? (
              <div className="mt-4">
                <Pagination
                  page={ticketsQuery.data.pagination.page}
                  totalPages={ticketsQuery.data.pagination.totalPages}
                  total={ticketsQuery.data.pagination.total}
                  limit={ticketsQuery.data.pagination.limit}
                  onPageChange={onPageChange}
                  onLimitChange={onLimitChange}
                  disabled={ticketsQuery.isFetching}
                  itemLabel="tickets"
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

export default AuthorTicketsPanel;
