import { Link, useLocation } from 'react-router-dom';
import { formatDate, formatDateTime } from '../../../lib/format.js';
import { TicketStatusBadge, PriorityBadge } from '../../../components/common/StatusBadge.jsx';
import TicketConversationButton from '../../../components/common/TicketConversationButton.jsx';
import { isOldUnresolvedTicket } from '../utils/ticketAge.js';
import { getAiStatusLabel } from '../utils/aiAnalysis.js';
import { buildTicketDetailState } from '../../../lib/ticketNavigation.js';

export function TicketQueueTable({ tickets }) {
  const location = useLocation();
  const queueSearch = location.search;
  const detailState = buildTicketDetailState({ queueSearch });

  if (!tickets.length) {
    return null;
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white lg:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                Ticket
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                Author
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                Context
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
                AI status
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                Assignee
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
            {tickets.map((ticket) => {
              const isStale = isOldUnresolvedTicket(ticket);
              return (
                <tr
                  key={ticket.id}
                  className={`hover:bg-slate-50 ${isStale ? 'bg-amber-50/40' : ''}`}
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/tickets/${ticket.id}`}
                      state={detailState}
                      className="group"
                    >
                      <div className="font-medium text-emerald-800 group-hover:underline">
                        {ticket.subject}
                      </div>
                      <div className="text-xs text-slate-500">{ticket.ticketNumber}</div>
                      {isStale ? (
                        <span className="mt-1 inline-block text-xs font-medium text-amber-700">
                          Older unresolved
                        </span>
                      ) : null}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-800">{ticket.author?.name || '—'}</div>
                    <div className="text-xs text-slate-500">{ticket.author?.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {ticket.book ? ticket.book.title : 'General / Account Level'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{ticket.category || 'Pending'}</td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={ticket.priority} />
                    {ticket.priorityOverride ? (
                      <p className="mt-1 text-xs font-medium text-amber-700">Overridden</p>
                    ) : null}
                    {ticket.aiPriority && ticket.aiPriority !== ticket.priority ? (
                      <p className="mt-1 text-xs text-slate-500">AI suggested: {ticket.aiPriority}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <TicketStatusBadge status={ticket.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {getAiStatusLabel(ticket.aiProcessingStatus, ticket.aiConfigured) || 'Pending'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {ticket.assignedAdmin?.name || ticket.assignedAdmin?.email || 'Unassigned'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{formatDateTime(ticket.lastMessageAt)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatDate(ticket.createdAt)}</td>
                  <td className="px-4 py-3">
                    <TicketConversationButton
                      to={`/admin/tickets/${ticket.id}`}
                      state={detailState}
                      ticketNumber={ticket.ticketNumber}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 lg:hidden">
        {tickets.map((ticket) => (
          <article
            key={ticket.id}
            className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${
              isOldUnresolvedTicket(ticket) ? 'border-amber-200' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <Link
                to={`/admin/tickets/${ticket.id}`}
                state={detailState}
                className="min-w-0 flex-1"
              >
                <p className="text-xs text-slate-500">{ticket.ticketNumber}</p>
                <h3 className="font-semibold text-slate-900">{ticket.subject}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {ticket.author?.name} · {ticket.status.replace(/_/g, ' ')} ·{' '}
                  {getAiStatusLabel(ticket.aiProcessingStatus, ticket.aiConfigured) || 'Pending'}
                </p>
              </Link>
              <TicketConversationButton
                to={`/admin/tickets/${ticket.id}`}
                state={detailState}
                ticketNumber={ticket.ticketNumber}
              />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

export default TicketQueueTable;
