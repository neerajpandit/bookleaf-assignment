import LoadingIndicator from '../../../components/feedback/LoadingIndicator.jsx';
import ErrorState from '../../../components/feedback/ErrorState.jsx';
import EmptyState from '../../../components/feedback/EmptyState.jsx';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { useAuthorDashboard } from '../hooks/useAuthorDashboard.js';
import {
  DashboardSummaryCards,
  DashboardQuickLinks,
} from '../components/DashboardSummaryCards.jsx';
import {
  DashboardRecentBooks,
  DashboardRecentTickets,
} from '../components/DashboardRecentSections.jsx';
import { normalizeApiError } from '../../../lib/apiError.js';
export function DashboardPage() {
  const { user } = useAuth();
  const { summary, recentBooks, recentTickets, books, isLoading, isError, error, refetch } =
    useAuthorDashboard();

  if (isLoading) {
    return <LoadingIndicator label="Loading your dashboard…" />;
  }

  if (isError) {
    const normalized = error?.normalized || normalizeApiError(error);
    return (
      <ErrorState
        title="Unable to load dashboard"
        message={normalized.message}
        onRetry={() => refetch()}
      />
    );
  }

  const hasBooks = books.length > 0;

  return (
    <>
      <PageHeader
        title={`Welcome, ${user?.name || 'Author'}`}
        description="Royalty and book summaries from your catalogue, plus recent support activity."
      />

      {hasBooks && summary ? (
        <>
          <DashboardSummaryCards summary={summary} />
          <DashboardQuickLinks />
          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <DashboardRecentBooks books={recentBooks} />
            <DashboardRecentTickets tickets={recentTickets} />
          </div>
        </>
      ) : (
        <>
          <EmptyState
            title="No books yet"
            description="Your book catalogue will appear here once titles are assigned to your account."
            action={<DashboardQuickLinks />}
          />
          <div className="mt-8">
            <DashboardRecentTickets tickets={recentTickets} />
          </div>
        </>
      )}
    </>
  );
}

export default DashboardPage;
