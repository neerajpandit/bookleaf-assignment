import ApiError from '../../utils/ApiError.js';
import httpStatus from '../../constants/httpStatus.js';
import AuditLog from '../audit-logs/auditLog.model.js';

export const createAuditEntry = async ({ ticketId, actorId, action, oldValue, newValue, metadata }) =>
  AuditLog.create({
    ticket: ticketId,
    actor: actorId,
    action,
    oldValue,
    newValue,
    metadata: metadata ?? null,
  });

export const persistTicketChangeWithAudit = async ({
  ticket,
  applyChange,
  buildAuditEntries,
}) => {
  const previousState = {
    status: ticket.status,
    category: ticket.category,
    priority: ticket.priority,
    priorityOverride: ticket.priorityOverride,
    priorityOverrideReason: ticket.priorityOverrideReason,
    priorityOverriddenBy: ticket.priorityOverriddenBy ?? null,
    priorityOverriddenAt: ticket.priorityOverriddenAt,
    assignedAdmin: ticket.assignedAdmin ?? null,
    resolvedAt: ticket.resolvedAt,
    closedAt: ticket.closedAt,
  };

  applyChange(ticket);
  await ticket.save();

  const auditEntries = buildAuditEntries(previousState, ticket);

  if (auditEntries.length === 0) {
    return ticket;
  }

  try {
    await Promise.all(auditEntries.map((entry) => createAuditEntry(entry)));
  } catch (error) {
    ticket.set({
      status: previousState.status,
      category: previousState.category,
      priority: previousState.priority,
      priorityOverride: previousState.priorityOverride,
      priorityOverrideReason: previousState.priorityOverrideReason,
      priorityOverriddenBy: previousState.priorityOverriddenBy,
      priorityOverriddenAt: previousState.priorityOverriddenAt,
      assignedAdmin: previousState.assignedAdmin,
      resolvedAt: previousState.resolvedAt,
      closedAt: previousState.closedAt,
    });
    await ticket.save();
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to record administrative audit log');
  }

  return ticket;
};

export const persistWithAuditEntries = async ({ persist, buildAuditEntries, rollback }) => {
  const persisted = await persist();

  try {
    const entries = buildAuditEntries(persisted);
    await Promise.all(entries.map((entry) => createAuditEntry(entry)));
    return persisted;
  } catch (error) {
    if (rollback) {
      await rollback(persisted);
    }

    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to record administrative audit log');
  }
};

export default {
  createAuditEntry,
  persistTicketChangeWithAudit,
  persistWithAuditEntries,
};
