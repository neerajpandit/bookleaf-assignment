import { useCallback, useState } from 'react';

export function usePaginationState(initialLimit = 10) {
  const [page, setPageState] = useState(1);
  const [limit, setLimitState] = useState(initialLimit);

  const setPage = useCallback((nextPage) => {
    setPageState(nextPage);
  }, []);

  const setLimit = useCallback((nextLimit) => {
    setLimitState(nextLimit);
    setPageState(1);
  }, []);

  const resetPage = useCallback(() => {
    setPageState(1);
  }, []);

  return {
    page,
    limit,
    setPage,
    setLimit,
    resetPage,
  };
}

export default usePaginationState;
