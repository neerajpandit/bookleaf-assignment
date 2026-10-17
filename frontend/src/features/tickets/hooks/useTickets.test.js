import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getTicketPollInterval } from './useTickets.js';
import { TICKET_POLL_INTERVAL_MS } from '../constants.js';

describe('getTicketPollInterval', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the configured poll interval when the tab is visible', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });

    const interval = getTicketPollInterval({ state: { error: null } });
    expect(interval).toBe(TICKET_POLL_INTERVAL_MS);
  });

  it('stops polling when the browser tab is inactive', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });

    const interval = getTicketPollInterval({ state: { error: null } });
    expect(interval).toBe(false);
  });

  it('stops polling after unauthorized responses', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });

    const interval = getTicketPollInterval({
      state: { error: { normalized: { isUnauthorized: true } } },
    });
    expect(interval).toBe(false);
  });
});
