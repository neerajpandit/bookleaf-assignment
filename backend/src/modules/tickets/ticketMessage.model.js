import mongoose from 'mongoose';
import { ROLE_VALUES } from '../../constants/roles.js';

const ticketMessageSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: [true, 'Ticket reference is required'],
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender reference is required'],
    },
    senderRole: {
      type: String,
      required: [true, 'Sender role is required'],
      enum: {
        values: ROLE_VALUES,
        message: '{VALUE} is not a valid sender role',
      },
    },
    body: {
      type: String,
      required: [true, 'Message body is required'],
      trim: true,
      maxlength: 10000,
    },
  },
  {
    timestamps: true,
  },
);

ticketMessageSchema.index({ ticket: 1, createdAt: 1 });

const TicketMessage =
  mongoose.models.TicketMessage || mongoose.model('TicketMessage', ticketMessageSchema);

export default TicketMessage;
