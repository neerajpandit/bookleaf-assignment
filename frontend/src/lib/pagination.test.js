import { describe, expect, it } from 'vitest';
import {
  clampPage,
  getPaginationRange,
  getVisiblePageNumbers,
  shouldShowListPagination,
} from './pagination.js';

describe('getPaginationRange', () => {
  it('returns no results summary when total is zero', () => {
    expect(getPaginationRange({ page: 1, limit: 20, total: 0 })).toEqual({
      start: 0,
      end: 0,
      summary: 'No results',
    });
  });

  it('returns the visible range for a middle page', () => {
    expect(getPaginationRange({ page: 2, limit: 20, total: 55 })).toEqual({
      start: 21,
      end: 40,
      summary: 'Showing 21–40 of 55',
    });
  });

  it('caps the end range on the final page', () => {
    expect(getPaginationRange({ page: 3, limit: 20, total: 55 })).toEqual({
      start: 41,
      end: 55,
      summary: 'Showing 41–55 of 55',
    });
  });
});

describe('clampPage', () => {
  it('clamps values to the available page range', () => {
    expect(clampPage(0, 5)).toBe(1);
    expect(clampPage(99, 5)).toBe(5);
    expect(clampPage(3, 5)).toBe(3);
  });
});

describe('shouldShowListPagination', () => {
  it('hides pagination when the list is empty', () => {
    expect(shouldShowListPagination({ page: 1, limit: 10, total: 0, totalPages: 1 })).toBe(false);
    expect(shouldShowListPagination(null)).toBe(false);
  });

  it('shows pagination when there are results', () => {
    expect(shouldShowListPagination({ page: 1, limit: 10, total: 3, totalPages: 1 })).toBe(true);
  });
});

describe('getVisiblePageNumbers', () => {
  it('returns all pages when the total is small', () => {
    expect(getVisiblePageNumbers(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it('returns a sliding window for larger page counts', () => {
    expect(getVisiblePageNumbers(5, 10)).toEqual([3, 4, 5, 6, 7]);
  });
});
