import Ticket from '../tickets/ticket.model.js';
import { TICKET_STATUSES } from '../../constants/ticketStatus.js';
import { TICKET_PRIORITIES } from '../../constants/ticketPriority.js';
import { toAdminTicket } from './adminTicket.service.js';

const TICKET_POPULATE = [
  { path: 'author', select: 'name email authorId' },
  { path: 'book', select: 'bookId title' },
  { path: 'assignedAdmin', select: 'name email' },
];

const UNRESOLVED_STATUSES = [TICKET_STATUSES.OPEN, TICKET_STATUSES.IN_PROGRESS];

const PRIORITY_RANK = {
  [TICKET_PRIORITIES.CRITICAL]: 0,
  [TICKET_PRIORITIES.HIGH]: 1,
};

const mergeUrgentTickets = (criticalTickets, highTickets, limit) => {
  const seen = new Set();

  return [...criticalTickets, ...highTickets]
    .filter((ticket) => {
      const id = ticket._id.toString();
      if (seen.has(id) || !UNRESOLVED_STATUSES.includes(ticket.status)) {
        return false;
      }
      seen.add(id);
      return true;
    })
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
    .slice(0, limit)
    .map(toAdminTicket);
};

export const getAdminDashboardTicketSections = async ({ limit = 5 } = {}) => {
  const unresolvedFilter = { status: { $in: UNRESOLVED_STATUSES } };
  const activitySort = { lastMessageAt: -1, updatedAt: -1, _id: -1 };

  const [criticalTickets, highTickets, oldestTickets, recentTickets] = await Promise.all([
    Ticket.find({ ...unresolvedFilter, priority: TICKET_PRIORITIES.CRITICAL })
      .populate(TICKET_POPULATE)
      .sort(activitySort)
      .limit(limit),
    Ticket.find({ ...unresolvedFilter, priority: TICKET_PRIORITIES.HIGH })
      .populate(TICKET_POPULATE)
      .sort(activitySort)
      .limit(limit),
    Ticket.find(unresolvedFilter)
      .populate(TICKET_POPULATE)
      .sort({ createdAt: 1, _id: 1 })
      .limit(limit),
    Ticket.find({})
      .populate(TICKET_POPULATE)
      .sort(activitySort)
      .limit(limit),
  ]);

  return {
    urgent: mergeUrgentTickets(criticalTickets, highTickets, limit),
    oldestUnresolved: oldestTickets.map(toAdminTicket),
    recentlyUpdated: recentTickets.map(toAdminTicket),
  };
};

export default {
  getAdminDashboardTicketSections,
};
