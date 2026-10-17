import { useQuery } from '@tanstack/react-query';
import { listAdminTickets } from '../api/adminTicketsApi.js';
import { adminKeys } from '../api/adminKeys.js';
import { listQueryPollOptions } from '../../../lib/listPollInterval.js';

/**
 * Loads tickets for a specific author using the admin queue authorId filter.
 */
export function useAuthorSupportTickets(authorUserId, params = { page: 1, limit: 50 }) {
  return useQuery({
    queryKey: [...adminKeys.all, 'authorTickets', authorUserId, params],
    queryFn: () =>
      listAdminTickets({
        ...params,
        authorId: authorUserId,
      }),
    enabled: Boolean(authorUserId),
    ...listQueryPollOptions,
  });
}

export default useAuthorSupportTickets;
