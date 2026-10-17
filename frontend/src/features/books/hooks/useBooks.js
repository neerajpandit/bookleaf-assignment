import { useQuery } from '@tanstack/react-query';
import { listBooks, fetchAllBooks } from '../api/booksApi.js';
import { bookKeys } from '../api/bookKeys.js';

export function useBooks(params) {
  return useQuery({
    queryKey: bookKeys.list(params),
    queryFn: () => listBooks(params),
  });
}

export function useAllBooks(filters = {}) {
  return useQuery({
    queryKey: bookKeys.allBooks(filters),
    queryFn: () => fetchAllBooks(filters),
  });
}

export default useBooks;
