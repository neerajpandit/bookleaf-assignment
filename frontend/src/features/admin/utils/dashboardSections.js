import { TICKET_PRIORITIES } from '../../../lib/constants/ticketPriority.js';
import { TICKET_STATUSES } from '../../../lib/constants/ticketStatus.js';

const PRIORITY_RANK = {
  [TICKET_PRIORITIES.CRITICAL]: 0,
  [TICKET_PRIORITIES.HIGH]: 1,
  [TICKET_PRIORITIES.MEDIUM]: 2,
  [TICKET_PRIORITIES.LOW]: 3,
};

const UNRESOLVED_STATUSES = new Set([TICKET_STATUSES.OPEN, TICKET_STATUSES.IN_PROGRESS]);

export function dedupeTicketsById(tickets) {
  const seen = new Set();
  return tickets.filter((ticket) => {
    if (!ticket?.id || seen.has(ticket.id)) {
      return false;
    }
    seen.add(ticket.id);
    return true;
  });
}

export function buildUrgentTickets(criticalItems = [], highItems = []) {
  const merged = dedupeTicketsById([...criticalItems, ...highItems]).filter((ticket) =>
    UNRESOLVED_STATUSES.has(ticket.status),
  );

  return merged
    .sort((left, right) => {
      const priorityDiff =
        (PRIORITY_RANK[left.priority] ?? 99) - (PRIORITY_RANK[right.priority] ?? 99);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      const leftActivity = new Date(left.lastMessageAt || left.updatedAt || 0).getTime();
      const rightActivity = new Date(right.lastMessageAt || right.updatedAt || 0).getTime();
      return rightActivity - leftActivity;
    })
    .slice(0, 5);
}

export function buildOldestUnresolvedTickets(openItems = [], inProgressItems = []) {
  return dedupeTicketsById([...openItems, ...inProgressItems])
    .filter((ticket) => UNRESOLVED_STATUSES.has(ticket.status))
    .sort(
      (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    )
    .slice(0, 5);
}

export function buildRecentlyUpdatedTickets(items = []) {
  return dedupeTicketsById(items).slice(0, 5);
}

export default {
  buildUrgentTickets,
  buildOldestUnresolvedTickets,
  buildRecentlyUpdatedTickets,
};
