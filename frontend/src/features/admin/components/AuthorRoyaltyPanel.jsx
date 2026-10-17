import LoadingIndicator from '../../../components/feedback/LoadingIndicator.jsx';
import ErrorState from '../../../components/feedback/ErrorState.jsx';
import { formatDate, formatINR } from '../../../lib/format.js';
import { normalizeApiError } from '../../../lib/apiError.js';

export function AuthorRoyaltyPanel({ royaltyQuery }) {
  return (
    <section aria-label="Royalty summary" className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Royalty summary</h2>
      <p className="mt-1 text-xs text-slate-500">
        Aggregate totals from the author&apos;s books. Individual payout transactions are not available.
      </p>

      <div className="mt-4">
        {royaltyQuery.isLoading ? (
          <LoadingIndicator label="Loading royalty summary…" />
        ) : royaltyQuery.isError ? (
          <ErrorState
            title="Unable to load royalty summary"
            message={(royaltyQuery.error?.normalized || normalizeApiError(royaltyQuery.error)).message}
            onRetry={() => royaltyQuery.refetch()}
          />
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Total earned</dt>
              <dd className="mt-1 text-lg font-semibold text-slate-900">
                {formatINR(royaltyQuery.data?.totalRoyaltyEarned)}
              </dd>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Total paid</dt>
              <dd className="mt-1 text-lg font-semibold text-slate-900">
                {formatINR(royaltyQuery.data?.totalRoyaltyPaid)}
              </dd>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Pending royalty</dt>
              <dd className="mt-1 text-lg font-semibold text-slate-900">
                {formatINR(royaltyQuery.data?.totalRoyaltyPending)}
              </dd>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Last payout date</dt>
              <dd className="mt-1 text-lg font-semibold text-slate-900">
                {formatDate(royaltyQuery.data?.lastRoyaltyPayoutDate)}
              </dd>
            </div>
          </dl>
        )}
      </div>
    </section>
  );
}

export default AuthorRoyaltyPanel;
