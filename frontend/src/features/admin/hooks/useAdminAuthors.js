import { useQuery } from '@tanstack/react-query';
import {
  listAdminAuthors,
  getAdminAuthorById,
  listAdminAuthorBooks,
  getAdminAuthorRoyaltySummary,
} from '../api/adminAuthorsApi.js';
import { adminKeys } from '../api/adminKeys.js';

export function useAdminAuthorDirectory(params) {
  return useQuery({
    queryKey: adminKeys.authorDirectory(params),
    queryFn: () => listAdminAuthors(params),
  });
}

export function useAdminAuthorDetail(authorUserId) {
  return useQuery({
    queryKey: adminKeys.authorDetail(authorUserId),
    queryFn: () => getAdminAuthorById(authorUserId),
    enabled: Boolean(authorUserId),
  });
}

export function useAdminAuthorBooks(authorUserId, params = { page: 1, limit: 10 }) {
  return useQuery({
    queryKey: adminKeys.authorBooks(authorUserId, params),
    queryFn: () => listAdminAuthorBooks(authorUserId, params),
    enabled: Boolean(authorUserId),
  });
}

export function useAdminAuthorRoyaltySummary(authorUserId) {
  return useQuery({
    queryKey: adminKeys.authorRoyalty(authorUserId),
    queryFn: () => getAdminAuthorRoyaltySummary(authorUserId),
    enabled: Boolean(authorUserId),
  });
}

export default useAdminAuthorDirectory;
