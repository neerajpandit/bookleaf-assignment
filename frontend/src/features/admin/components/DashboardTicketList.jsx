import { Link } from 'react-router-dom';
import { formatDateTime } from '../../../lib/format.js';
import { TicketStatusBadge, PriorityBadge } from '../../../components/common/StatusBadge.jsx';
import TicketConversationButton from '../../../components/common/TicketConversationButton.jsx';
import { isOldUnresolvedTicket } from '../utils/ticketAge.js';
import { buildTicketDetailState } from '../../../lib/ticketNavigation.js';

function TicketRow({ ticket, showCreated = false, showUrgencyNote = false }) {
  const isStale = isOldUnresolvedTicket(ticket);
  const detailState = buildTicketDetailState({ origin: 'dashboard' });

  return (
    <li className="rounded-md border border-slate-200 bg-white px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            to={`/admin/tickets/${ticket.id}`}
            state={detailState}
            className="font-medium text-emerald-800 hover:underline"
          >
            {ticket.subject}
          </Link>
          <p className="mt-0.5 text-xs text-slate-500">{ticket.ticketNumber}</p>
          <p className="mt-1 text-sm text-slate-600">
            {ticket.author?.name || 'Unknown author'}
            {ticket.author?.email ? ` · ${ticket.author.email}` : ''}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {ticket.category || 'Pending classification'}
            {ticket.book ? ` · ${ticket.book.title}` : ' · General / Account Level'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <PriorityBadge priority={ticket.priority} />
          <TicketStatusBadge status={ticket.status} />
          <TicketConversationButton
            to={`/admin/tickets/${ticket.id}`}
            state={detailState}
            ticketNumber={ticket.ticketNumber}
          />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>Last activity: {formatDateTime(ticket.lastMessageAt)}</span>
        {showCreated ? <span>Created: {formatDateTime(ticket.createdAt)}</span> : null}
        {showUrgencyNote && (ticket.priority === 'CRITICAL' || ticket.priority === 'HIGH') ? (
          <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
            {ticket.priority} priority
          </span>
        ) : null}
        {isStale ? (
          <span className="rounded bg-amber-50 px-2 py-0.5 font-medium text-amber-800">
            Older unresolved
          </span>
        ) : null}
      </div>
    </li>
  );
}

export function DashboardTicketList({
  title,
  description,
  tickets,
  emptyTitle,
  emptyDescription,
  showCreated = false,
  showUrgencyNote = false,
  viewAllTo,
}) {
  return (
    <section aria-labelledby={`${title.replace(/\s+/g, '-').toLowerCase()}-heading`}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id={`${title.replace(/\s+/g, '-').toLowerCase()}-heading`}
            className="text-sm font-semibold text-slate-900"
          >
            {title}
          </h2>
          {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
        </div>
        {viewAllTo ? (
          <Link to={viewAllTo} className="text-xs font-medium text-emerald-800 hover:underline">
            View all
          </Link>
        ) : null}
      </div>

      {!tickets.length ? (
        <div className="rounded-md border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
          <p className="font-medium text-slate-800">{emptyTitle}</p>
          {emptyDescription ? <p className="mt-1 text-xs text-slate-500">{emptyDescription}</p> : null}
        </div>
      ) : (
        <ul className="space-y-2">
          {tickets.map((ticket) => (
            <TicketRow
              key={ticket.id}
              ticket={ticket}
              showCreated={showCreated}
              showUrgencyNote={showUrgencyNote}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export default DashboardTicketList;
