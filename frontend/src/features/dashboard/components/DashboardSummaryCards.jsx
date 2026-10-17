import { Link } from 'react-router-dom';
import { formatINR } from '../../../lib/format.js';

function SummaryCard({ label, value, subtext, to }) {
  const content = (
    <>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {subtext ? <p className="mt-1 text-xs text-slate-500">{subtext}</p> : null}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50/40"
      >
        {content}
      </Link>
    );
  }

  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">{content}</div>;
}

export function DashboardSummaryCards({ summary }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <SummaryCard label="Total books" value={summary.totalBooks} />
      <SummaryCard label="Published books" value={summary.publishedBooks} />
      <SummaryCard label="Books in production" value={summary.booksInProduction} />
      <SummaryCard
        label="Total royalties earned"
        value={formatINR(summary.totalRoyaltiesEarned)}
      />
      <SummaryCard label="Total royalties paid" value={formatINR(summary.totalRoyaltiesPaid)} />
      <SummaryCard label="Pending royalties" value={formatINR(summary.pendingRoyalties)} />
      {summary.openTickets != null ? (
        <SummaryCard
          label="Open tickets"
          value={summary.openTickets}
          to="/author/tickets?status=OPEN"
          subtext={
            summary.totalTickets != null
              ? `${summary.totalTickets} total support ticket${summary.totalTickets === 1 ? '' : 's'}`
              : undefined
          }
        />
      ) : null}
    </div>
  );
}

export function DashboardQuickLinks() {
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <Link
        to="/author/books"
        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        View My Books
      </Link>
      <Link
        to="/author/tickets"
        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        View My Tickets
      </Link>
      <Link
        to="/author/tickets/new"
        state={{ ticketOrigin: 'dashboard' }}
        className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
      >
        Create support ticket
      </Link>
    </div>
  );
}

export default DashboardSummaryCards;
