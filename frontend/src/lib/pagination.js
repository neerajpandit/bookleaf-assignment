export const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function clampPage(page, totalPages) {
  const safeTotalPages = Math.max(0, totalPages);
  if (safeTotalPages === 0) {
    return 1;
  }

  const safePage = Number(page);
  if (!Number.isFinite(safePage)) {
    return 1;
  }

  return Math.min(Math.max(1, Math.trunc(safePage)), safeTotalPages);
}

export function getPaginationRange({ page, limit, total }) {
  if (typeof total !== 'number' || total <= 0) {
    return { start: 0, end: 0, summary: 'No results' };
  }

  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const start = (safePage - 1) * safeLimit + 1;
  const end = Math.min(safePage * safeLimit, total);

  return {
    start,
    end,
    summary: `Showing ${start}–${end} of ${total}`,
  };
}

/**
 * Returns page numbers to render as quick-jump buttons (capped for readability).
 */
export function getVisiblePageNumbers(currentPage, totalPages, maxButtons = 5) {
  if (totalPages <= 1) {
    return [];
  }

  if (totalPages <= maxButtons) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const half = Math.floor(maxButtons / 2);
  let start = Math.max(1, currentPage - half);
  let end = start + maxButtons - 1;

  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, end - maxButtons + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function shouldShowListPagination(pagination) {
  return Boolean(pagination && (pagination.total ?? 0) > 0);
}

export default getPaginationRange;
