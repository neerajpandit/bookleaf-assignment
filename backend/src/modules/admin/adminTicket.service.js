import ApiError from '../../utils/ApiError.js';
import httpStatus from '../../constants/httpStatus.js';
import { ROLES } from '../../constants/roles.js';
import { UNASSIGNED_ADMIN_FILTER } from '../../constants/adminTicketQuery.js';
import { AUDIT_ACTIONS } from '../../constants/auditActions.js';
import User from '../users/user.model.js';
import Ticket from '../tickets/ticket.model.js';
import { escapeRegex } from '../../utils/escapeRegex.js';
import { persistTicketChangeWithAudit } from './auditHelper.js';
import {
  openStoredAttachmentStream,
  toPublicTicketAttachment,
} from '../attachments/ticketAttachment.service.js';
import { ensureAdminTicketAiDraft, isAiProcessingAvailable } from '../ai/aiAnalysis.service.js';
import {
  applyStatusTimestamps,
  assertValidStatusTransition,
} from './statusTransitions.js';

const toAdminUserSummary = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user._id.toString(),
    name: user.name ?? null,
    email: user.email,
    authorId: user.authorId ?? null,
  };
};

const toAdminAssigneeSummary = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user._id.toString(),
    name: user.name ?? null,
    email: user.email,
  };
};

const toAdminBookSummary = (book) => {
  if (!book) {
    return null;
  }

  return {
    bookId: book.bookId,
    title: book.title,
  };
};

export const toAdminTicket = (ticket) => ({
  id: ticket._id.toString(),
  ticketNumber: ticket.ticketNumber,
  subject: ticket.subject,
  description: ticket.description,
  status: ticket.status,
  category: ticket.category ?? null,
  priority: ticket.priority ?? null,
  priorityOverride: Boolean(ticket.priorityOverride),
  aiCategory: ticket.aiCategory ?? null,
  aiPriority: ticket.aiPriority ?? null,
  aiProcessingStatus: ticket.aiProcessingStatus ?? null,
  author: toAdminUserSummary(ticket.author),
  book: toAdminBookSummary(ticket.book),
  attachment: toPublicTicketAttachment(ticket.attachment),
  assignedAdmin: toAdminAssigneeSummary(ticket.assignedAdmin),
  lastMessageAt: ticket.lastMessageAt ?? null,
  resolvedAt: ticket.resolvedAt ?? null,
  closedAt: ticket.closedAt ?? null,
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
});

export const toAdminTicketDetail = (ticket) => ({
  ...toAdminTicket(ticket),
  policyCategory: ticket.policyCategory ?? null,
  policyPriority: ticket.policyPriority ?? null,
  policyPriorityRationale: ticket.policyPriorityRationale ?? null,
  policyRuleId: ticket.policyRuleId ?? null,
  suggestedCategory: ticket.aiCategory ?? null,
  suggestedPriority: ticket.aiPriority ?? null,
  suggestionReason: ticket.aiPriorityRationale ?? null,
  suggestionSource: ticket.suggestionSource ?? ticket.aiProvider ?? null,
  suggestedAt: ticket.aiProcessedAt ?? null,
  priorityOverride: Boolean(ticket.priorityOverride),
  priorityOverrideReason: ticket.priorityOverrideReason ?? null,
  priorityOverriddenBy: toAdminAssigneeSummary(ticket.priorityOverriddenBy),
  priorityOverriddenAt: ticket.priorityOverriddenAt ?? null,
  aiProcessingStatus: ticket.aiProcessingStatus,
  aiDraftResponse: ticket.aiDraftResponse ?? null,
  aiPriorityRationale: ticket.aiPriorityRationale ?? null,
  aiKnowledgeBaseReferences: ticket.aiKnowledgeBaseReferences ?? [],
  aiNeedsHumanReview: ticket.aiNeedsHumanReview ?? null,
  aiProvider: ticket.aiProvider ?? null,
  aiModel: ticket.aiModel ?? null,
  aiProcessedAt: ticket.aiProcessedAt ?? null,
  aiError: ticket.aiError ?? null,
  aiConfigured: isAiProcessingAvailable(),
});

const buildAdminTicketFilter = async (query) => {
  const filter = {};

  if (query.authorId) {
    filter.author = query.authorId;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.category) {
    filter.category = query.category;
  }

  if (query.priority) {
    filter.priority = query.priority;
  }

  if (query.aiProcessingStatus) {
    filter.aiProcessingStatus = query.aiProcessingStatus;
  }

  if (query.assignedTo === UNASSIGNED_ADMIN_FILTER) {
    filter.assignedAdmin = null;
  } else if (query.assignedTo) {
    filter.assignedAdmin = query.assignedTo;
  }

  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};

    if (query.dateFrom) {
      filter.createdAt.$gte = query.dateFrom;
    }

    if (query.dateTo) {
      filter.createdAt.$lte = query.dateTo;
    }
  }

  if (query.search) {
    const escapedSearch = escapeRegex(query.search);

    const authorMatches = await User.find({
      role: ROLES.AUTHOR,
      $or: [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } },
      ],
    }).select('_id');

    const searchConditions = [
      { ticketNumber: { $regex: escapedSearch, $options: 'i' } },
      { subject: { $regex: escapedSearch, $options: 'i' } },
    ];

    if (authorMatches.length > 0) {
      searchConditions.push({ author: { $in: authorMatches.map((user) => user._id) } });
    }

    filter.$or = searchConditions;
  }

  return filter;
};

export const getAdminTicketById = async (
  ticketId,
  { adminUserId = null, ensureAiDraft = false } = {},
) => {
  if (ensureAiDraft && adminUserId) {
    await ensureAdminTicketAiDraft(adminUserId, ticketId);
  }

  const ticket = await getAdminTicketOrThrow(ticketId);
  return toAdminTicketDetail(ticket);
};

export const listAdminTickets = async (query) => {
  const { page, limit } = query;
  const filter = await buildAdminTicketFilter(query);
  const skip = (page - 1) * limit;

  const [tickets, total] = await Promise.all([
    Ticket.find(filter)
      .populate({ path: 'author', select: 'name email authorId' })
      .populate({ path: 'book', select: 'bookId title' })
      .populate({ path: 'assignedAdmin', select: 'name email' })
      .sort({ lastMessageAt: -1, updatedAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit),
    Ticket.countDocuments(filter),
  ]);

  return {
    items: tickets.map(toAdminTicket),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

const getAdminTicketOrThrow = async (ticketId) => {
  const ticket = await Ticket.findById(ticketId)
    .populate({ path: 'author', select: 'name email authorId' })
    .populate({ path: 'book', select: 'bookId title' })
    .populate({ path: 'assignedAdmin', select: 'name email' })
    .populate({ path: 'priorityOverriddenBy', select: 'name email' });

  if (!ticket) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found');
  }

  return ticket;
};

const validateAssigneeAdmin = async (assigneeId) => {
  const admin = await User.findById(assigneeId);

  if (!admin || admin.role !== ROLES.ADMIN || !admin.isActive) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid administrator assignee');
  }

  return admin;
};

export const updateAdminTicketAssignment = async (adminUserId, ticketId, payload) => {
  const ticket = await getAdminTicketOrThrow(ticketId);
  const previousAssignee = ticket.assignedAdmin?.toString?.() ?? null;
  const nextAssignee = payload.assignedTo;

  if (previousAssignee === nextAssignee) {
    return toAdminTicket(ticket);
  }

  if (nextAssignee) {
    await validateAssigneeAdmin(nextAssignee);
  }

  await persistTicketChangeWithAudit({
    ticket,
    applyChange: (currentTicket) => {
      currentTicket.assignedAdmin = nextAssignee;
    },
    buildAuditEntries: () => [
      {
        ticketId: ticket._id,
        actorId: adminUserId,
        action: AUDIT_ACTIONS.TICKET_ASSIGNED,
        oldValue: previousAssignee,
        newValue: nextAssignee,
      },
    ],
  });

  await ticket.populate([
    { path: 'author', select: 'name email authorId' },
    { path: 'book', select: 'bookId title' },
    { path: 'assignedAdmin', select: 'name email' },
  ]);

  return toAdminTicket(ticket);
};

export const updateAdminTicketStatus = async (adminUserId, ticketId, payload) => {
  const ticket = await getAdminTicketOrThrow(ticketId);
  const previousStatus = ticket.status;
  const nextStatus = payload.status;

  if (!assertValidStatusTransition(previousStatus, nextStatus)) {
    return toAdminTicket(ticket);
  }

  await persistTicketChangeWithAudit({
    ticket,
    applyChange: (currentTicket) => {
      applyStatusTimestamps(currentTicket, nextStatus);
      currentTicket.status = nextStatus;
    },
    buildAuditEntries: () => [
      {
        ticketId: ticket._id,
        actorId: adminUserId,
        action: AUDIT_ACTIONS.TICKET_STATUS_CHANGED,
        oldValue: previousStatus,
        newValue: nextStatus,
      },
    ],
  });

  await ticket.populate([
    { path: 'author', select: 'name email authorId' },
    { path: 'book', select: 'bookId title' },
    { path: 'assignedAdmin', select: 'name email' },
  ]);

  return toAdminTicket(ticket);
};

export const updateAdminTicketClassification = async (adminUserId, ticketId, payload) => {
  const ticket = await getAdminTicketOrThrow(ticketId);
  const auditEntries = [];

  if (payload.clearPriorityOverride) {
    if (!ticket.policyPriority) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No policy priority is available to restore');
    }

    if (ticket.priority !== ticket.policyPriority || ticket.priorityOverride) {
      auditEntries.push({
        ticketId: ticket._id,
        actorId: adminUserId,
        action: AUDIT_ACTIONS.TICKET_PRIORITY_OVERRIDE_CLEARED,
        oldValue: ticket.priority,
        newValue: ticket.policyPriority,
        metadata: {
          policyPriority: ticket.policyPriority,
          aiSuggestedPriority: ticket.aiPriority ?? null,
          previousOverrideReason: ticket.priorityOverrideReason ?? null,
        },
      });
    }
  }

  if (payload.category !== undefined && payload.category !== ticket.category) {
    auditEntries.push({
      ticketId: ticket._id,
      actorId: adminUserId,
      action: AUDIT_ACTIONS.TICKET_CATEGORY_CHANGED,
      oldValue: ticket.category,
      newValue: payload.category,
    });
  }

  if (
    payload.priority !== undefined &&
    payload.priority !== ticket.priority &&
    !payload.clearPriorityOverride
  ) {
    auditEntries.push({
      ticketId: ticket._id,
      actorId: adminUserId,
      action: AUDIT_ACTIONS.TICKET_PRIORITY_CHANGED,
      oldValue: ticket.priority,
      newValue: payload.priority,
      metadata: {
        suggestedPriority: ticket.aiPriority ?? null,
        overrideReason: payload.priorityOverrideReason ?? null,
      },
    });
  }

  if (auditEntries.length === 0) {
    return toAdminTicketDetail(ticket);
  }

  await persistTicketChangeWithAudit({
    ticket,
    applyChange: (currentTicket) => {
      if (payload.clearPriorityOverride) {
        currentTicket.priority = currentTicket.policyPriority;
        currentTicket.priorityOverride = false;
        currentTicket.priorityOverrideReason = null;
        currentTicket.priorityOverriddenBy = null;
        currentTicket.priorityOverriddenAt = null;
      }

      if (payload.category !== undefined) {
        currentTicket.category = payload.category;
      }

      if (payload.priority !== undefined && !payload.clearPriorityOverride) {
        currentTicket.priority = payload.priority;
        currentTicket.priorityOverride = true;
        currentTicket.priorityOverrideReason = payload.priorityOverrideReason?.trim() || null;
        currentTicket.priorityOverriddenBy = adminUserId;
        currentTicket.priorityOverriddenAt = new Date();
      }
    },
    buildAuditEntries: () => auditEntries,
  });

  const refreshed = await getAdminTicketOrThrow(ticketId);
  return toAdminTicketDetail(refreshed);
};

export const getAdminTicketAttachmentStream = async (ticketId) => {
  const ticket = await Ticket.findById(ticketId).select('attachment');

  if (!ticket) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found');
  }

  if (!ticket.attachment?.storageKey) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Attachment not found');
  }

  const { stream } = openStoredAttachmentStream(ticket.attachment.storageKey);

  return {
    stream,
    attachment: ticket.attachment,
  };
};

export default {
  listAdminTickets,
  getAdminTicketById,
  getAdminTicketAttachmentStream,
  updateAdminTicketAssignment,
  updateAdminTicketStatus,
  updateAdminTicketClassification,
  toAdminTicket,
  toAdminTicketDetail,
};
