import apiClient from '../../../lib/apiClient.js';

export const listAdminAuthors = async (params = {}) => {
  const response = await apiClient.get('/admin/authors', { params });
  return {
    items: response.data?.data?.items ?? [],
    pagination: response.data?.data?.pagination ?? {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    },
  };
};

export const getAdminAuthorCount = async (params = {}) => {
  const { pagination } = await listAdminAuthors({ ...params, page: 1, limit: 1 });
  return pagination.total;
};

export const getAdminAuthorById = async (authorUserId) => {
  const response = await apiClient.get(`/admin/authors/${authorUserId}`);
  return response.data?.data?.author ?? null;
};

export const listAdminAuthorBooks = async (authorUserId, params = {}) => {
  const response = await apiClient.get(`/admin/authors/${authorUserId}/books`, { params });
  return {
    items: response.data?.data?.items ?? [],
    pagination: response.data?.data?.pagination ?? {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    },
  };
};

export const getAdminAuthorRoyaltySummary = async (authorUserId) => {
  const response = await apiClient.get(`/admin/authors/${authorUserId}/royalty-summary`);
  return response.data?.data?.summary ?? null;
};

export default {
  listAdminAuthors,
  getAdminAuthorCount,
  getAdminAuthorById,
  listAdminAuthorBooks,
  getAdminAuthorRoyaltySummary,
};
