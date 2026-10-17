import { Link } from 'react-router-dom';
import LoadingIndicator from '../../../components/feedback/LoadingIndicator.jsx';
import ErrorState from '../../../components/feedback/ErrorState.jsx';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import { TICKET_PRIORITIES } from '../../../lib/constants/ticketPriority.js';
import { TICKET_STATUSES } from '../../../lib/constants/ticketStatus.js';
import { useAdminDashboardStats } from '../hooks/useAdminDashboardStats.js';
import { useAdminDashboardSections } from '../hooks/useAdminDashboardSections.js';
import AdminDashboardCards from '../components/AdminDashboardCards.jsx';
import DashboardTicketList from '../components/DashboardTicketList.jsx';
import { normalizeApiError } from '../../../lib/apiError.js';

export function AdminDashboardPage() {
  const statsQuery = useAdminDashboardStats();
  const sectionsQuery = useAdminDashboardSections();

  const isLoading = statsQuery.isLoading || sectionsQuery.isLoading;
  const isError = statsQuery.isError || sectionsQuery.isError;
  const error = statsQuery.error || sectionsQuery.error;

  const refetchAll = () => Promise.all([statsQuery.refetch(), sectionsQuery.refetch()]);

  return (
    <>
      <PageHeader
        title="Operations overview"
        description="Support metrics and active ticket queues computed from the full authorized admin ticket dataset."
        actions={
          <Link
            to="/admin/tickets"
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Open ticket queue
          </Link>
        }
      />

      {isLoading ? (
        <LoadingIndicator label="Loading dashboard…" />
      ) : isError ? (
        <ErrorState
          title="Unable to load dashboard"
          message={(error?.normalized || normalizeApiError(error)).message}
          onRetry={() => refetchAll()}
        />
      ) : (
        <div className="space-y-8">
          <AdminDashboardCards stats={statsQuery.stats} />

          <div className="grid gap-6 xl:grid-cols-3">
            <DashboardTicketList
              title="Urgent tickets"
              description="Critical and high priority tickets that remain open or in progress."
              tickets={sectionsQuery.sections.urgent}
              showUrgencyNote
              emptyTitle="No urgent tickets in the current preview"
              emptyDescription="Critical and high priority tickets will appear here when they need attention."
              viewAllTo={`/admin/tickets?priority=${TICKET_PRIORITIES.CRITICAL}`}
            />
            <DashboardTicketList
              title="Oldest unresolved tickets"
              description="Open and in-progress tickets sorted by creation time across the full queue."
              tickets={sectionsQuery.sections.oldestUnresolved}
              showCreated
              emptyTitle="No unresolved tickets in the current preview"
              emptyDescription="Older unresolved work will appear here based on ticket creation timestamps."
              viewAllTo={`/admin/tickets?status=${TICKET_STATUSES.OPEN}`}
            />
            <DashboardTicketList
              title="Recently updated tickets"
              description="Most recently active tickets from the queue API default sort."
              tickets={sectionsQuery.sections.recentlyUpdated}
              emptyTitle="No recently updated tickets"
              emptyDescription="Tickets with recent public activity will appear here."
              viewAllTo="/admin/tickets"
            />
          </div>

          <p className="text-xs text-slate-500">
            AI-assisted review is available on each ticket detail page. Use the ticket queue to filter
            by AI processing status when triaging pending or failed analyses.
          </p>
        </div>
      )}
    </>
  );
}

export default AdminDashboardPage;
