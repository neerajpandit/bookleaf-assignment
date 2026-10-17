import mongoose from 'mongoose';
import { TICKET_STATUS_VALUES, TICKET_STATUSES } from '../../constants/ticketStatus.js';
import { TICKET_CATEGORY_VALUES } from '../../constants/ticketCategory.js';
import { TICKET_PRIORITY_VALUES } from '../../constants/ticketPriority.js';
import { AI_PROCESSING_STATUS_VALUES, AI_PROCESSING_STATUSES } from '../../constants/aiProcessingStatus.js';
import { SUGGESTION_SOURCE_VALUES } from '../../constants/suggestionSource.js';

const ticketAttachmentSchema = new mongoose.Schema(
  {
    originalFilename: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    storageKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 127,
    },
    sizeBytes: {
      type: Number,
      required: true,
      min: 1,
    },
    uploadedAt: {
      type: Date,
      required: true,
    },
    storageProvider: {
      type: String,
      required: true,
      trim: true,
      maxlength: 32,
      default: 'local',
    },
  },
  { _id: false },
);

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: [true, 'Ticket number is required'],
      trim: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author reference is required'],
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      default: null,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: 5000,
    },
    attachment: {
      type: ticketAttachmentSchema,
      default: null,
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: TICKET_STATUS_VALUES,
        message: '{VALUE} is not a valid ticket status',
      },
      default: TICKET_STATUSES.OPEN,
    },
    category: {
      type: String,
      enum: {
        values: TICKET_CATEGORY_VALUES,
        message: '{VALUE} is not a valid ticket category',
      },
      default: null,
    },
    priority: {
      type: String,
      enum: {
        values: TICKET_PRIORITY_VALUES,
        message: '{VALUE} is not a valid ticket priority',
      },
      default: null,
    },
    priorityOverride: {
      type: Boolean,
      default: false,
    },
    priorityOverrideReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    priorityOverriddenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    priorityOverriddenAt: {
      type: Date,
      default: null,
    },
    policyCategory: {
      type: String,
      enum: {
        values: TICKET_CATEGORY_VALUES,
        message: '{VALUE} is not a valid policy category',
      },
      default: null,
    },
    policyPriority: {
      type: String,
      enum: {
        values: TICKET_PRIORITY_VALUES,
        message: '{VALUE} is not a valid policy priority',
      },
      default: null,
    },
    policyPriorityRationale: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
    policyRuleId: {
      type: String,
      trim: true,
      maxlength: 128,
      default: null,
    },
    suggestionSource: {
      type: String,
      enum: {
        values: SUGGESTION_SOURCE_VALUES,
        message: '{VALUE} is not a valid suggestion source',
      },
      default: null,
    },
    aiCategory: {
      type: String,
      enum: {
        values: TICKET_CATEGORY_VALUES,
        message: '{VALUE} is not a valid AI category',
      },
      default: null,
    },
    aiPriority: {
      type: String,
      enum: {
        values: TICKET_PRIORITY_VALUES,
        message: '{VALUE} is not a valid AI priority',
      },
      default: null,
    },
    aiProcessingStatus: {
      type: String,
      enum: {
        values: AI_PROCESSING_STATUS_VALUES,
        message: '{VALUE} is not a valid AI processing status',
      },
      default: AI_PROCESSING_STATUSES.PENDING,
    },
    aiDraftResponse: {
      type: String,
      trim: true,
      maxlength: 10000,
      default: null,
    },
    aiDraftContextLastMessageAt: {
      type: Date,
      default: null,
    },
    aiProcessedAt: {
      type: Date,
      default: null,
    },
    aiError: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    aiProvider: {
      type: String,
      trim: true,
      maxlength: 32,
      default: null,
    },
    aiModel: {
      type: String,
      trim: true,
      maxlength: 128,
      default: null,
    },
    aiPriorityRationale: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
    aiKnowledgeBaseReferences: {
      type: [String],
      default: [],
    },
    aiNeedsHumanReview: {
      type: Boolean,
      default: null,
    },
    assignedAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

ticketSchema.index({ ticketNumber: 1 }, { unique: true });
ticketSchema.index({ author: 1, createdAt: -1 });
ticketSchema.index({ author: 1, status: 1 });
ticketSchema.index({ status: 1, priority: 1, createdAt: 1 });
ticketSchema.index({ assignedAdmin: 1, status: 1, createdAt: -1 });
ticketSchema.index({ category: 1, status: 1, createdAt: -1 });

const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);

export default Ticket;
