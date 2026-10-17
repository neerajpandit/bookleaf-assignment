import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebouncedValue } from '../../admin/hooks/useDebouncedValue.js';

const parseAuthorTicketParams = (searchParams, defaultLimit) => ({
  page: Number(searchParams.get('page') || 1),
  limit: Number(searchParams.get('limit') || defaultLimit),
  status: searchParams.get('status') || '',
  category: searchParams.get('category') || '',
  search: searchParams.get('search') || '',
});

const buildApiParams = ({ page, limit, status, category, search }) => {
  const apiParams = { page, limit };

  if (status) apiParams.status = status;
  if (category) apiParams.category = category;
  if (search) apiParams.search = search;

  return apiParams;
};

export function useAuthorTicketFilters(initialLimit = 10) {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(
    () => parseAuthorTicketParams(searchParams, initialLimit),
    [searchParams, initialLimit],
  );
  const [searchInput, setSearchInput] = useState(params.search);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setSearchInput(params.search);
  }, [params.search]);

  useEffect(() => {
    if (debouncedSearch === params.search) {
      return;
    }

    setSearchParams((current) => {
      const next = new URLSearchParams(current);

      if (debouncedSearch) {
        next.set('search', debouncedSearch);
      } else {
        next.delete('search');
      }

      next.set('page', '1');
      return next;
    });
  }, [debouncedSearch, params.search, setSearchParams]);

  const filters = useMemo(
    () => ({
      status: params.status,
      category: params.category,
      search: params.search,
    }),
    [params.status, params.category, params.search],
  );

  const apiParams = useMemo(() => buildApiParams(params), [params]);

  const listSearch = useMemo(() => {
    const query = searchParams.toString();
    return query ? `?${query}` : '';
  }, [searchParams]);

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

  const setFilter = useCallback(
    (updates) => {
      if ('searchInput' in updates) {
        setSearchInput(updates.searchInput);
        return;
      }

      setSearchParams((current) => {
        const next = new URLSearchParams(current);

        if ('status' in updates) {
          if (updates.status) next.set('status', updates.status);
          else next.delete('status');
        }

        if ('category' in updates) {
          if (updates.category) next.set('category', updates.category);
          else next.delete('category');
        }

        next.set('page', '1');
        return next;
      });
    },
    [setSearchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  return {
    page: params.page,
    limit: params.limit,
    filters,
    searchInput,
    apiParams,
    listSearch,
    setPage,
    setLimit,
    setFilter,
    clearFilters,
  };
}

export default useAuthorTicketFilters;
