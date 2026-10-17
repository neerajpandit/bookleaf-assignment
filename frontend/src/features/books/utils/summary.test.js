import { describe, expect, it } from 'vitest';
import { computeBookSummary } from './summary.js';
import { mockBooks } from '../../../test/fixtures.js';

describe('computeBookSummary', () => {
  it('aggregates royalty totals from all books without altering values', () => {
    const summary = computeBookSummary(mockBooks);

    expect(summary.totalBooks).toBe(2);
    expect(summary.publishedBooks).toBe(1);
    expect(summary.booksInProduction).toBe(1);
    expect(summary.totalRoyaltiesEarned).toBe(11970);
    expect(summary.totalRoyaltiesPaid).toBe(8400);
    expect(summary.pendingRoyalties).toBe(3570);
  });

  it('returns zeros for an empty catalogue', () => {
    const summary = computeBookSummary([]);

    expect(summary.totalBooks).toBe(0);
    expect(summary.totalRoyaltiesEarned).toBe(0);
    expect(summary.pendingRoyalties).toBe(0);
  });
});
