import { useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import BackButton from '../../../components/common/BackButton.jsx';
import {
  resolveAdminAuthorDetailBackLabel,
  resolveAdminAuthorDetailBackPath,
} from '../../../lib/ticketNavigation.js';
import LoadingIndicator from '../../../components/feedback/LoadingIndicator.jsx';
import ErrorState from '../../../components/feedback/ErrorState.jsx';
import Button from '../../../components/ui/Button.jsx';
import { normalizeApiError } from '../../../lib/apiError.js';
import {
  useAdminAuthorDetail,
  useAdminAuthorBooks,
  useAdminAuthorRoyaltySummary,
} from '../hooks/useAdminAuthors.js';
import { useAuthorSupportTickets } from '../hooks/useAuthorSupportTickets.js';
import AuthorProfilePanel from '../components/AuthorProfilePanel.jsx';
import AuthorBooksPanel from '../components/AuthorBooksPanel.jsx';
import AuthorRoyaltyPanel from '../components/AuthorRoyaltyPanel.jsx';
import AuthorTicketsPanel from '../components/AuthorTicketsPanel.jsx';

export function AdminAuthorDetailPage() {
  const { authorUserId } = useParams();
  const location = useLocation();
  const backTo = resolveAdminAuthorDetailBackPath(location.state);
  const backLabel = resolveAdminAuthorDetailBackLabel(location.state);
  const backButton = <BackButton to={backTo} label={backLabel} />;
  const [booksPage, setBooksPage] = useState(1);
  const [booksLimit, setBooksLimit] = useState(10);
  const [booksStatus, setBooksStatus] = useState('');
  const [booksSearch, setBooksSearch] = useState('');
  const [ticketsPage, setTicketsPage] = useState(1);
  const [ticketsLimit, setTicketsLimit] = useState(10);

  const authorQuery = useAdminAuthorDetail(authorUserId);
  const booksQuery = useAdminAuthorBooks(authorUserId, {
    page: booksPage,
    limit: booksLimit,
    ...(booksStatus ? { status: booksStatus } : {}),
    ...(booksSearch ? { search: booksSearch } : {}),
  });
  const royaltyQuery = useAdminAuthorRoyaltySummary(authorUserId);
  const ticketsQuery = useAuthorSupportTickets(authorUserId, {
    page: ticketsPage,
    limit: ticketsLimit,
  });

  const refetchAll = () =>
    Promise.all([
      authorQuery.refetch(),
      booksQuery.refetch(),
      royaltyQuery.refetch(),
      ticketsQuery.refetch(),
    ]);

  if (authorQuery.isLoading) {
    return (
      <>
        <div className="mb-4">{backButton}</div>
        <LoadingIndicator label="Loading author profile…" />
      </>
    );
  }

  if (authorQuery.isError) {
    const normalized = authorQuery.error?.normalized || normalizeApiError(authorQuery.error);
    return (
      <>
        <div className="mb-4">{backButton}</div>
        <PageHeader title="Author unavailable" description="The requested author could not be loaded." />
        <ErrorState
          title={normalized.statusCode === 404 ? 'Author not found' : 'Unable to load author'}
          message={
            normalized.statusCode === 404
              ? 'This author does not exist or is not accessible.'
              : normalized.message
          }
          onRetry={normalized.statusCode === 404 ? undefined : () => authorQuery.refetch()}
        />
      </>
    );
  }

  const author = authorQuery.data;
  if (!author) {
    return (
      <>
        <div className="mb-4">{backButton}</div>
        <ErrorState
          title="Author not found"
          message="This author could not be loaded."
        />
      </>
    );
  }

  return (
    <>
      <div className="mb-4">{backButton}</div>
      <PageHeader
        title={author.name || author.email}
        description={`${author.authorId} · ${author.email}`}
        actions={
          <Button variant="secondary" onClick={() => refetchAll()} isLoading={authorQuery.isFetching}>
            Refresh
          </Button>
        }
      />

      <div className="space-y-6">
        <AuthorProfilePanel author={author} />
        <AuthorRoyaltyPanel royaltyQuery={royaltyQuery} />
        <AuthorBooksPanel
          booksQuery={booksQuery}
          bookFilters={{ status: booksStatus, search: booksSearch }}
          onBookFiltersChange={(updates) => {
            if ('status' in updates) {
              setBooksStatus(updates.status);
            }
            if ('search' in updates) {
              setBooksSearch(updates.search);
            }
            setBooksPage(1);
          }}
          onPageChange={setBooksPage}
          onLimitChange={(nextLimit) => {
            setBooksLimit(nextLimit);
            setBooksPage(1);
          }}
        />
        <AuthorTicketsPanel
          ticketsQuery={ticketsQuery}
          authorUserId={authorUserId}
          onPageChange={setTicketsPage}
          onLimitChange={(nextLimit) => {
            setTicketsLimit(nextLimit);
            setTicketsPage(1);
          }}
        />

        <section aria-label="Support history" className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Support history</h2>
          <p className="mt-2 text-sm text-slate-600">
            Public conversations and private notes are available on each linked ticket detail page. There is
            no combined author activity timeline endpoint.
          </p>
        </section>
      </div>
    </>
  );
}

export default AdminAuthorDetailPage;
