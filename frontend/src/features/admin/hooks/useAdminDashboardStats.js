import { useQueries } from '@tanstack/react-query';
import { getAdminTicketCount } from '../api/adminTicketsApi.js';
import { getAdminAuthorCount } from '../api/adminAuthorsApi.js';
import { adminKeys } from '../api/adminKeys.js';
import { TICKET_STATUSES } from '../../../lib/constants/ticketStatus.js';
import { TICKET_PRIORITIES } from '../../../lib/constants/ticketPriority.js';
import { listQueryPollOptions } from '../../../lib/listPollInterval.js';

const countQuery = (key, filters) => ({
  queryKey: adminKeys.count(key),
  queryFn: () => getAdminTicketCount(filters),
  staleTime: 30 * 1000,
  ...listQueryPollOptions,
});

export function useAdminDashboardStats() {
  const results = useQueries({
    queries: [
      countQuery('status-open', { status: TICKET_STATUSES.OPEN }),
      countQuery('status-in-progress', { status: TICKET_STATUSES.IN_PROGRESS }),
      countQuery('status-resolved', { status: TICKET_STATUSES.RESOLVED }),
      countQuery('status-closed', { status: TICKET_STATUSES.CLOSED }),
      countQuery('priority-critical', { priority: TICKET_PRIORITIES.CRITICAL }),
      countQuery('priority-high', { priority: TICKET_PRIORITIES.HIGH }),
      countQuery('assigned-unassigned', { assignedTo: 'unassigned' }),
      {
        queryKey: adminKeys.authorDirectory({ metric: 'total' }),
        queryFn: () => getAdminAuthorCount(),
        staleTime: 30 * 1000,
        ...listQueryPollOptions,
      },
    ],
  });

  const isLoading = results.some((result) => result.isLoading);
  const isError = results.some((result) => result.isError);
  const error = results.find((result) => result.error)?.error;

  const refetch = () => Promise.all(results.map((result) => result.refetch()));

  const open = results[0].data ?? 0;
  const inProgress = results[1].data ?? 0;
  const resolved = results[2].data ?? 0;
  const closed = results[3].data ?? 0;

  const stats = {
    open,
    inProgress,
    resolved,
    closed,
    total: open + inProgress + resolved + closed,
    critical: results[4].data ?? 0,
    high: results[5].data ?? 0,
    unassigned: results[6].data ?? 0,
    totalAuthors: results[7].data ?? 0,
  };

  return { stats, isLoading, isError, error, refetch };
}

export default useAdminDashboardStats;
