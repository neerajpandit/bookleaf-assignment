import { TICKET_POLL_INTERVAL_MS } from '../features/tickets/constants.js';

/**
 * Shared polling interval for ticket lists and dashboard summaries.
 * Pauses when the tab is hidden or the session is unauthorized.
 */
export function getListPollInterval(query) {
  if (typeof document !== 'undefined' && document.hidden) {
    return false;
  }

  if (query.state.error?.normalized?.isUnauthorized) {
    return false;
  }

  return TICKET_POLL_INTERVAL_MS;
}

export const listQueryPollOptions = {
  refetchInterval: getListPollInterval,
  refetchIntervalInBackground: false,
};

export default getListPollInterval;
