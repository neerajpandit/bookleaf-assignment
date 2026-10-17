import Counter from './counter.model.js';
import {
  TICKET_COUNTER_KEY,
  TICKET_NUMBER_INITIAL_SEQUENCE,
  formatTicketNumber,
} from '../../constants/ticketNumber.js';

export const generateTicketNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    { key: TICKET_COUNTER_KEY },
    [
      {
        $set: {
          key: TICKET_COUNTER_KEY,
          sequence: {
            $add: [{ $ifNull: ['$sequence', TICKET_NUMBER_INITIAL_SEQUENCE] }, 1],
          },
        },
      },
    ],
    { upsert: true, new: true },
  );

  return formatTicketNumber(counter.sequence);
};

export default generateTicketNumber;
