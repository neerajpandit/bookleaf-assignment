import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
const parseQueueParams = (searchParams) => ({
  page: Number(searchParams.get('page') || 1),
  limit: Number(searchParams.get('limit') || 20),
  status: searchParams.get('status') || '',
  category: searchParams.get('category') || '',
  priority: searchParams.get('priority') || '',
  assignedTo: searchParams.get('assignedTo') || '',
  dateFrom: searchParams.get('dateFrom') || '',
  dateTo: searchParams.get('dateTo') || '',
  search: searchParams.get('search') || '',
  authorId: searchParams.get('authorId') || '',
  aiProcessingStatus: searchParams.get('aiProcessingStatus') || '',
  assignedToMe: searchParams.get('assignedToMe') === 'true',
});

const buildApiParams = (params, currentAdminId) => {
  const apiParams = {
    page: params.page,
    limit: params.limit,
  };

  if (params.status) apiParams.status = params.status;
  if (params.category) apiParams.category = params.category;
  if (params.priority) apiParams.priority = params.priority;
  if (params.dateFrom) apiParams.dateFrom = params.dateFrom;
  if (params.dateTo) apiParams.dateTo = params.dateTo;
  if (params.search) apiParams.search = params.search;
  if (params.authorId) apiParams.authorId = params.authorId;
  if (params.aiProcessingStatus) apiParams.aiProcessingStatus = params.aiProcessingStatus;

  if (params.assignedToMe && currentAdminId) {
    apiParams.assignedTo = currentAdminId;
  } else if (params.assignedTo) {
    apiParams.assignedTo = params.assignedTo;
  }

  return apiParams;
};

export function useQueueSearchParams(currentAdminId) {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => parseQueueParams(searchParams), [searchParams]);

  const apiParams = useMemo(
    () => buildApiParams(params, currentAdminId),
    [params, currentAdminId],
  );

  const setFilters = useCallback(
    (updates) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);

        Object.entries(updates).forEach(([key, value]) => {
          if (value === '' || value === false || value === null || value === undefined) {
            next.delete(key);
          } else {
            next.set(key, String(value));
          }
        });

        if (!('page' in updates)) {
          next.set('page', '1');
        }

        return next;
      });
    },
    [setSearchParams],
  );

  const setPage = useCallback(
    (page) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set('page', String(page));
        return next;
      });
    },
    [setSearchParams],
  );

  const setLimit = useCallback(
    (limit) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set('limit', String(limit));
        next.set('page', '1');
        return next;
      });
    },
    [setSearchParams],
  );

  return { params, apiParams, setFilters, setPage, setLimit, searchParams };
}

export default useQueueSearchParams;
