import ApiError from '../../utils/ApiError.js';
import httpStatus from '../../constants/httpStatus.js';
import { TICKET_STATUSES } from '../../constants/ticketStatus.js';

/**
 * Minimal admin status transition policy:
 * - OPEN, IN_PROGRESS, and RESOLVED may move between each other or forward to CLOSED.
 * - CLOSED is terminal; closed tickets cannot change status.
 */
export const ALLOWED_STATUS_TRANSITIONS = {
  [TICKET_STATUSES.OPEN]: [
    TICKET_STATUSES.IN_PROGRESS,
    TICKET_STATUSES.RESOLVED,
    TICKET_STATUSES.CLOSED,
  ],
  [TICKET_STATUSES.IN_PROGRESS]: [
    TICKET_STATUSES.OPEN,
    TICKET_STATUSES.RESOLVED,
    TICKET_STATUSES.CLOSED,
  ],
  [TICKET_STATUSES.RESOLVED]: [
    TICKET_STATUSES.IN_PROGRESS,
    TICKET_STATUSES.CLOSED,
  ],
  [TICKET_STATUSES.CLOSED]: [],
};

export const assertValidStatusTransition = (currentStatus, nextStatus) => {
  if (currentStatus === nextStatus) {
    return false;
  }

  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(nextStatus)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Invalid status transition from ${currentStatus} to ${nextStatus}`,
    );
  }

  return true;
};

export const applyStatusTimestamps = (ticket, nextStatus) => {
  const now = new Date();

  if (nextStatus === TICKET_STATUSES.RESOLVED) {
    ticket.resolvedAt = now;
  } else if (ticket.status === TICKET_STATUSES.RESOLVED) {
    ticket.resolvedAt = null;
  }

  if (nextStatus === TICKET_STATUSES.CLOSED) {
    ticket.closedAt = now;
  } else if (ticket.status === TICKET_STATUSES.CLOSED) {
    ticket.closedAt = null;
  }
};

export default {
  ALLOWED_STATUS_TRANSITIONS,
  assertValidStatusTransition,
  applyStatusTimestamps,
};
