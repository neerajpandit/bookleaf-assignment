const OLD_TICKET_DAYS = 7;

export function isOldUnresolvedTicket(ticket) {
  if (!ticket?.createdAt) {
    return false;
  }

  if (ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') {
    return false;
  }

  const created = new Date(ticket.createdAt);
  const ageMs = Date.now() - created.getTime();
  return ageMs > OLD_TICKET_DAYS * 24 * 60 * 60 * 1000;
}

export default isOldUnresolvedTicket;
