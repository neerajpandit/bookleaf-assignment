import mongoose from 'mongoose';

const internalNoteSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: [true, 'Ticket reference is required'],
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Administrator reference is required'],
    },
    body: {
      type: String,
      required: [true, 'Note body is required'],
      trim: true,
      minlength: [1, 'Note body cannot be empty'],
      maxlength: 5000,
    },
  },
  {
    timestamps: true,
  },
);

internalNoteSchema.index({ ticket: 1, createdAt: 1 });

const InternalNote =
  mongoose.models.InternalNote || mongoose.model('InternalNote', internalNoteSchema);

export default InternalNote;
