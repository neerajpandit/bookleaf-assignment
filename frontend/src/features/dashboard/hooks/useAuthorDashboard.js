import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAllBooks } from '../../books/hooks/useBooks.js';
import { listBooks } from '../../books/api/booksApi.js';
import { listTickets, getOpenTicketCount } from '../../tickets/api/ticketsApi.js';
import { bookKeys } from '../../books/api/bookKeys.js';
import { ticketKeys } from '../../tickets/api/ticketKeys.js';
import { computeBookSummary } from '../../books/utils/summary.js';
export function useAuthorDashboard() {
  const booksQuery = useAllBooks();
  const openTicketsQuery = useQuery({
    queryKey: ticketKeys.openCount(),
    queryFn: getOpenTicketCount,
  });
  const recentBooksQuery = useQuery({
    queryKey: [...bookKeys.all, 'recent'],
    queryFn: () => listBooks({ page: 1, limit: 5 }),
  });
  const recentTicketsQuery = useQuery({
    queryKey: ticketKeys.dashboard(),
    queryFn: () => listTickets({ page: 1, limit: 5 }),
  });

  const summary = useMemo(() => {
    if (!booksQuery.data) {
      return null;
    }

    const bookSummary = computeBookSummary(booksQuery.data);

    return {
      ...bookSummary,
      openTickets: openTicketsQuery.data ?? null,
    };
  }, [booksQuery.data, openTicketsQuery.data]);

  const isLoading =
    booksQuery.isLoading || openTicketsQuery.isLoading || recentBooksQuery.isLoading || recentTicketsQuery.isLoading;
  const isError =
    booksQuery.isError || openTicketsQuery.isError || recentBooksQuery.isError || recentTicketsQuery.isError;
  const error =
    booksQuery.error || openTicketsQuery.error || recentBooksQuery.error || recentTicketsQuery.error;

  const refetchAll = () =>
    Promise.all([
      booksQuery.refetch(),
      openTicketsQuery.refetch(),
      recentBooksQuery.refetch(),
      recentTicketsQuery.refetch(),
    ]);

  return {
    summary,
    recentBooks: recentBooksQuery.data?.items ?? [],
    recentTickets: recentTicketsQuery.data?.items ?? [],
    books: booksQuery.data ?? [],
    isLoading,
    isError,
    error,
    refetch: refetchAll,
  };
}

export default useAuthorDashboard;
