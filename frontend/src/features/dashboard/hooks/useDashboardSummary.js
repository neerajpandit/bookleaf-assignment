import { useMemo } from 'react';
import { useAllBooks } from '../../books/hooks/useBooks.js';
import { computeBookSummary } from '../../books/utils/summary.js';

export function useDashboardSummary() {
  const query = useAllBooks();

  const summary = useMemo(() => {
    if (!query.data) {
      return null;
    }
    return computeBookSummary(query.data);
  }, [query.data]);

  return {
    ...query,
    summary,
  };
}

export default useDashboardSummary;
