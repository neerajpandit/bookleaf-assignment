import apiClient from '../../../lib/apiClient.js';

/**
 * @typedef {Object} Book
 * @property {string} bookId
 * @property {string} title
 * @property {string} isbn
 * @property {string} genre
 * @property {string|null} publicationDate
 * @property {string} status
 * @property {number|null} mrp
 * @property {number|null} authorRoyaltyPerCopy
 * @property {number} totalCopiesSold
 * @property {number} totalRoyaltyEarned
 * @property {number} royaltyPaid
 * @property {number} royaltyPending
 * @property {string|null} lastRoyaltyPayoutDate
 * @property {string|null} printPartner
 * @property {string[]} availableOn
 */

/**
 * @typedef {Object} PaginationMeta
 * @property {number} page
 * @property {number} limit
 * @property {number} total
 * @property {number} totalPages
 */

/**
 * @param {{ page?: number, limit?: number, status?: string, search?: string }} params
 */
export const listBooks = async (params = {}) => {
  const response = await apiClient.get('/books', { params });
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

/**
 * Fetches all author books across pages for dashboard aggregation and selectors.
 * @param {{ status?: string, search?: string }} filters
 * @returns {Promise<Book[]>}
 */
export const fetchAllBooks = async (filters = {}) => {
  const limit = 50;
  let page = 1;
  let allItems = [];
  let totalPages = 1;

  do {
    const { items, pagination } = await listBooks({ ...filters, page, limit });
    allItems = allItems.concat(items);
    totalPages = pagination.totalPages;
    page += 1;
  } while (page <= totalPages);

  return allItems;
};

export default {
  listBooks,
  fetchAllBooks,
};
