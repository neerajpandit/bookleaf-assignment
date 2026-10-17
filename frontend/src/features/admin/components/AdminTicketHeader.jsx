import { Link, useLocation, useParams } from 'react-router-dom';
import { TicketStatusBadge, PriorityBadge } from '../../../components/common/StatusBadge.jsx';
import BackButton from '../../../components/common/BackButton.jsx';
import { formatDateTime } from '../../../lib/format.js';
import {
  resolveAdminTicketBackLabel,
  resolveAdminTicketBackPath,
} from '../../../lib/ticketNavigation.js';

export function AdminTicketHeader({ ticket }) {
  const location = useLocation();
  const { ticketId } = useParams();
  const backTo = resolveAdminTicketBackPath(location.state);
  const backLabel = resolveAdminTicketBackLabel(location.state);

  return (
    <>
      <div className="mb-4">
        <BackButton to={backTo} label={backLabel} />
      </div>
      <section
        aria-label="Ticket summary"
        className="mb-6 rounded-lg border border-slate-200 bg-white p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {ticket.ticketNumber}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">{ticket.subject}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {ticket.author?.name} ({ticket.author?.email})
            </p>
            {ticket.author?.id ? (
              <Link
                to={`/admin/authors/${ticket.author.id}`}
                state={{
                  returnTo: `/admin/tickets/${ticketId}`,
                  queueSearch: location.state?.queueSearch,
                }}
                className="mt-2 inline-block text-sm font-medium text-emerald-800 hover:underline"
              >
                View author profile
              </Link>
            ) : null}
          </div>
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-slate-500">Status</dt>
            <dd className="mt-1">
              <TicketStatusBadge status={ticket.status} />
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Category</dt>
            <dd className="mt-1 text-slate-800">{ticket.category || 'Pending'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Priority</dt>
            <dd className="mt-1">
              <PriorityBadge priority={ticket.priority} />
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Assignee</dt>
            <dd className="mt-1 text-slate-800">
              {ticket.assignedAdmin?.name || ticket.assignedAdmin?.email || 'Unassigned'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Created</dt>
            <dd className="mt-1 text-slate-800">{formatDateTime(ticket.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Last activity</dt>
            <dd className="mt-1 text-slate-800">{formatDateTime(ticket.lastMessageAt)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Linked book</dt>
            <dd className="mt-1 text-slate-800">
              {ticket.book ? `${ticket.book.title} (${ticket.book.bookId})` : 'General / Account Level'}
            </dd>
          </div>
        </dl>
      </section>
    </>
  );
}

export default AdminTicketHeader;
