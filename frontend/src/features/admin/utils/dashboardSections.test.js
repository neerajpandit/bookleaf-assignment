import { describe, expect, it } from 'vitest';
import {
  buildOldestUnresolvedTickets,
  buildRecentlyUpdatedTickets,
  buildUrgentTickets,
} from './dashboardSections.js';

const ticket = (overrides) => ({
  id: '1',
  ticketNumber: 'TKT-1',
  subject: 'Test',
  status: 'OPEN',
  priority: 'HIGH',
  category: 'General Inquiry',
  createdAt: '2025-10-01T09:00:00.000Z',
  lastMessageAt: '2025-10-17T10:00:00.000Z',
  author: { name: 'Author', email: 'author@test.com' },
  ...overrides,
});

describe('dashboardSections utils', () => {
  it('builds urgent tickets from real priority values and excludes resolved work', () => {
    const urgent = buildUrgentTickets(
      [ticket({ id: 'c1', priority: 'CRITICAL' })],
      [ticket({ id: 'h1', priority: 'HIGH' }), ticket({ id: 'r1', status: 'RESOLVED', priority: 'HIGH' })],
    );

    expect(urgent.map((item) => item.id)).toEqual(['c1', 'h1']);
  });

  it('sorts oldest unresolved tickets by creation time ascending', () => {
    const oldest = buildOldestUnresolvedTickets(
      [ticket({ id: 'new', createdAt: '2025-10-10T09:00:00.000Z' })],
      [ticket({ id: 'old', createdAt: '2025-10-01T09:00:00.000Z' })],
    );

    expect(oldest.map((item) => item.id)).toEqual(['old', 'new']);
  });

  it('deduplicates recently updated tickets', () => {
    const recent = buildRecentlyUpdatedTickets([
      ticket({ id: 'a' }),
      ticket({ id: 'a' }),
      ticket({ id: 'b' }),
    ]);

    expect(recent).toHaveLength(2);
  });
});
