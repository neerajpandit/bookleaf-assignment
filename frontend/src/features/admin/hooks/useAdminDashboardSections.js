import { useQuery } from '@tanstack/react-query';
import { getAdminDashboardTicketSections } from '../api/adminTicketsApi.js';
import { adminKeys } from '../api/adminKeys.js';
import { listQueryPollOptions } from '../../../lib/listPollInterval.js';

export function useAdminDashboardSections() {
  const query = useQuery({
    queryKey: adminKeys.dashboardSections({ limit: 5 }),
    queryFn: () => getAdminDashboardTicketSections({ limit: 5 }),
    staleTime: 30 * 1000,
    ...listQueryPollOptions,
  });

  const sections = query.data ?? {
    urgent: [],
    oldestUnresolved: [],
    recentlyUpdated: [],
  };

  return {
    sections,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useAdminDashboardSections;
