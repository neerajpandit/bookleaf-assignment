import { Link } from 'react-router-dom';
import { formatDate, formatDateTime } from '../../../lib/format.js';
import { TicketStatusBadge, PriorityBadge } from '../../../components/common/StatusBadge.jsx';
import TicketConversationButton from '../../../components/common/TicketConversationButton.jsx';
import { buildTicketDetailState } from '../../../lib/ticketNavigation.js';

function TicketCard({ ticket, detailState }) {
  const contextLabel = ticket.book ? ticket.book.title : 'General / Account Level';

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link to={`/author/tickets/${ticket.id}`} state={detailState} className="block">
            <p className="text-xs font-medium text-slate-500">{ticket.ticketNumber}</p>
            <h3 className="font-semibold text-slate-900">{ticket.subject}</h3>
          </Link>
        </div>
        <div className="flex flex-col items-end gap-2">
          <TicketStatusBadge status={ticket.status} />
          <TicketConversationButton
            to={`/author/tickets/${ticket.id}`}
            state={detailState}
            ticketNumber={ticket.ticketNumber}
          />
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-slate-500">Category</dt>
          <dd>{ticket.category || 'Pending'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Priority</dt>
          <dd>
            <PriorityBadge priority={ticket.priority} />
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-slate-500">Context</dt>
          <dd>{contextLabel}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Last activity</dt>
          <dd>{formatDateTime(ticket.lastMessageAt)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Created</dt>
          <dd>{formatDate(ticket.createdAt)}</dd>
        </div>
      </dl>
    </article>
  );
}

export function TicketList({ tickets, listSearch = '' }) {
  const detailState = buildTicketDetailState({ listSearch });

  if (!tickets.length) {
    return null;
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white md:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                Ticket
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                Category
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                Priority
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                Context
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                Last activity
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                Created
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link to={`/author/tickets/${ticket.id}`} state={detailState} className="group">
                    <div className="font-medium text-emerald-800 group-hover:underline">
                      {ticket.subject}
                    </div>
                    <div className="text-xs text-slate-500">{ticket.ticketNumber}</div>
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700">{ticket.category || 'Pending'}</td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={ticket.priority} />
                </td>
                <td className="px-4 py-3">
                  <TicketStatusBadge status={ticket.status} />
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {ticket.book ? ticket.book.title : 'General / Account Level'}
                </td>
                <td className="px-4 py-3 text-slate-700">{formatDateTime(ticket.lastMessageAt)}</td>
                <td className="px-4 py-3 text-slate-700">{formatDate(ticket.createdAt)}</td>
                <td className="px-4 py-3">
                  <TicketConversationButton
                    to={`/author/tickets/${ticket.id}`}
                    state={detailState}
                    ticketNumber={ticket.ticketNumber}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 md:hidden">
        {tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} detailState={detailState} />
        ))}
      </div>
    </>
  );
}

export default TicketList;
