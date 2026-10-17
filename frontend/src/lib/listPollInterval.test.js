import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getListPollInterval } from './listPollInterval.js';
import { TICKET_POLL_INTERVAL_MS } from '../features/tickets/constants.js';

describe('getListPollInterval', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the configured poll interval when the tab is visible', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });

    expect(getListPollInterval({ state: { error: null } })).toBe(TICKET_POLL_INTERVAL_MS);
  });

  it('stops polling when the browser tab is inactive', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });

    expect(getListPollInterval({ state: { error: null } })).toBe(false);
  });

  it('stops polling after unauthorized responses', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });

    expect(
      getListPollInterval({
        state: { error: { normalized: { isUnauthorized: true } } },
      }),
    ).toBe(false);
  });
});
