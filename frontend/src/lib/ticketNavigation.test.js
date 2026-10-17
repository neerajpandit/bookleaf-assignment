import { describe, expect, it } from 'vitest';
import {
  buildTicketDetailState,
  resolveAdminAuthorDetailBackPath,
  resolveAdminTicketBackLabel,
  resolveAdminTicketBackPath,
  resolveAuthorCreateTicketBackPath,
  resolveAuthorTicketBackLabel,
  resolveAuthorTicketBackPath,
} from './ticketNavigation.js';

describe('ticketNavigation', () => {
  it('builds ticket detail navigation state', () => {
    expect(
      buildTicketDetailState({
        listSearch: '?page=2&status=OPEN',
        origin: 'dashboard',
      }),
    ).toEqual({
      listSearch: '?page=2&status=OPEN',
      ticketOrigin: 'dashboard',
    });
  });

  it('resolves author back paths with safe fallbacks', () => {
    expect(resolveAuthorTicketBackPath({ ticketOrigin: 'dashboard' })).toBe('/author');
    expect(resolveAuthorTicketBackPath({ listSearch: '?status=OPEN' })).toBe(
      '/author/tickets?status=OPEN',
    );
    expect(resolveAuthorTicketBackPath(undefined)).toBe('/author/tickets');
    expect(resolveAuthorTicketBackLabel({ ticketOrigin: 'dashboard' })).toBe('Back to dashboard');
  });

  it('resolves admin back paths with queue, dashboard, and author fallbacks', () => {
    expect(resolveAdminTicketBackPath({ queueSearch: '?priority=HIGH' })).toBe(
      '/admin/tickets?priority=HIGH',
    );
    expect(resolveAdminTicketBackPath({ ticketOrigin: 'dashboard' })).toBe('/admin');
    expect(
      resolveAdminTicketBackPath({ ticketOrigin: 'author-profile', authorId: 'author-1' }),
    ).toBe('/admin/authors/author-1');
    expect(resolveAdminTicketBackPath(undefined)).toBe('/admin/tickets');
    expect(resolveAdminAuthorDetailBackPath({ returnTo: '/admin/tickets/ticket-1' })).toBe(
      '/admin/tickets/ticket-1',
    );
    expect(resolveAdminAuthorDetailBackPath(undefined)).toBe('/admin/authors');
    expect(resolveAuthorCreateTicketBackPath({ ticketOrigin: 'dashboard' })).toBe('/author');
    expect(resolveAuthorCreateTicketBackPath({ listSearch: '?status=OPEN' })).toBe(
      '/author/tickets?status=OPEN',
    );
  });
});
