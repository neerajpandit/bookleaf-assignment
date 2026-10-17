import { Link } from 'react-router-dom';
import { TICKET_STATUSES } from '../../../lib/constants/ticketStatus.js';
import { TICKET_PRIORITIES } from '../../../lib/constants/ticketPriority.js';

function StatCard({ label, value, to, description, unavailable = false }) {
  const content = (
    <div
      className={`rounded-lg border bg-white p-4 shadow-sm transition-colors ${
        unavailable
          ? 'border-slate-200 bg-slate-50'
          : 'border-slate-200 hover:border-emerald-300'
      }`}
    >
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">
        {unavailable ? '—' : value}
      </p>
      {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
    </div>
  );

  if (to && !unavailable) {
    return (
      <Link to={to} className="block focus-visible:outline-offset-4">
        {content}
      </Link>
    );
  }

  return content;
}

export function AdminDashboardCards({ stats }) {
  const hasStatusTotals =
    typeof stats.open === 'number' &&
    typeof stats.inProgress === 'number' &&
    typeof stats.resolved === 'number' &&
    typeof stats.closed === 'number';

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Total tickets"
        value={stats.total}
        unavailable={!hasStatusTotals}
        description="Sum of status totals from queue API pagination"
        to="/admin/tickets"
      />
      <StatCard
        label="Open tickets"
        value={stats.open}
        to={`/admin/tickets?status=${TICKET_STATUSES.OPEN}`}
      />
      <StatCard
        label="In progress"
        value={stats.inProgress}
        to={`/admin/tickets?status=${TICKET_STATUSES.IN_PROGRESS}`}
      />
      <StatCard
        label="Resolved"
        value={stats.resolved}
        to={`/admin/tickets?status=${TICKET_STATUSES.RESOLVED}`}
      />
      <StatCard
        label="Closed"
        value={stats.closed}
        to={`/admin/tickets?status=${TICKET_STATUSES.CLOSED}`}
      />
      <StatCard
        label="Critical priority"
        value={stats.critical}
        to={`/admin/tickets?priority=${TICKET_PRIORITIES.CRITICAL}`}
        description="Queue total for critical priority"
      />
      <StatCard
        label="High priority"
        value={stats.high}
        to={`/admin/tickets?priority=${TICKET_PRIORITIES.HIGH}`}
        description="Queue total for high priority"
      />
      <StatCard
        label="Unassigned tickets"
        value={stats.unassigned}
        to="/admin/tickets?assignedTo=unassigned"
        description="Tickets without an assigned administrator"
      />
      <StatCard
        label="Total authors"
        value={stats.totalAuthors}
        to="/admin/authors"
        description="Registered author accounts"
      />
    </div>
  );
}

export default AdminDashboardCards;
