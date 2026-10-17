export const TICKET_COUNTER_KEY = 'ticket_number';

/** First issued ticket number is TKT-1001 (sequence starts at 1000 and increments atomically). */
export const TICKET_NUMBER_INITIAL_SEQUENCE = 1000;

export const formatTicketNumber = (sequence) => `TKT-${sequence}`;

export default {
  TICKET_COUNTER_KEY,
  TICKET_NUMBER_INITIAL_SEQUENCE,
  formatTicketNumber,
};
