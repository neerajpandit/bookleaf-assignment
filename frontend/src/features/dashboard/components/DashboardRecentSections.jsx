import { Link } from 'react-router-dom';
import { formatDate, formatDateTime, formatINR } from '../../../lib/format.js';
import { TicketStatusBadge, PriorityBadge } from '../../../components/common/StatusBadge.jsx';
import TicketConversationButton from '../../../components/common/TicketConversationButton.jsx';
import { buildTicketDetailState } from '../../../lib/ticketNavigation.js';

export function DashboardRecentBooks({ books }) {
  return (
    <section aria-labelledby="recent-books-heading">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="recent-books-heading" className="text-sm font-semibold text-slate-900">
            Recent books
          </h2>
          <p className="mt-1 text-xs text-slate-500">Latest titles from your catalogue.</p>
        </div>
        <Link to="/author/books" className="text-xs font-medium text-emerald-800 hover:underline">
          View all books
        </Link>
      </div>

      {!books.length ? (
        <div className="rounded-md border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
          <p className="font-medium text-slate-800">No books yet</p>
          <p className="mt-1 text-xs text-slate-500">Assigned titles will appear here.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {books.map((book) => (
            <li key={book.bookId} className="rounded-md border border-slate-200 bg-white px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{book.title}</p>
                  <p className="text-xs text-slate-500">{book.bookId}</p>
                </div>
                <span className="text-xs text-slate-600">{book.status}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {book.genre || '—'} · Earned {formatINR(book.totalRoyaltyEarned)} · Pending{' '}
                {formatINR(book.royaltyPending)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DashboardRecentTickets({ tickets }) {
  return (
    <section aria-labelledby="recent-tickets-heading">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="recent-tickets-heading" className="text-sm font-semibold text-slate-900">
            Recent support tickets
          </h2>
          <p className="mt-1 text-xs text-slate-500">Your latest support conversations.</p>
        </div>
        <Link to="/author/tickets" className="text-xs font-medium text-emerald-800 hover:underline">
          View all tickets
        </Link>
      </div>

      {!tickets.length ? (
        <div className="rounded-md border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
          <p className="font-medium text-slate-800">No support tickets yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Create a ticket when you need help with royalties, production, or account questions.
          </p>
          <Link
            to="/author/tickets/new"
            state={{ ticketOrigin: 'dashboard' }}
            className="mt-3 inline-block text-sm font-medium text-emerald-800 hover:underline"
          >
            Create support ticket
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {tickets.map((ticket) => {
            const detailState = buildTicketDetailState({ origin: 'dashboard' });

            return (
            <li key={ticket.id} className="rounded-md border border-slate-200 bg-white px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/author/tickets/${ticket.id}`}
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
                    to={`/author/tickets/${ticket.id}`}
                    state={detailState}
                    ticketNumber={ticket.ticketNumber}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {ticket.category || 'Pending'} ·{' '}
                {ticket.book ? ticket.book.title : 'General / Account Level'} · Updated{' '}
                {formatDateTime(ticket.lastMessageAt)} · Created {formatDate(ticket.createdAt)}
              </p>
            </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default DashboardRecentBooks;
