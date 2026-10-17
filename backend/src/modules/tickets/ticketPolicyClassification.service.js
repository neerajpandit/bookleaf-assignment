import Ticket from './ticket.model.js';
import AuditLog from '../audit-logs/auditLog.model.js';
import { AI_PROCESSING_STATUSES } from '../../constants/aiProcessingStatus.js';
import { AUDIT_ACTIONS } from '../../constants/auditActions.js';
import { SUGGESTION_SOURCES } from '../../constants/suggestionSource.js';
import { loadAiConfig } from '../ai/aiConfig.js';
import { getAiProvider } from '../ai/aiProviderFactory.js';
import { suggestTicketClassification } from './priorityPolicy.service.js';

const isAiClassificationEnabled = () => {
  const config = loadAiConfig();
  return config.enabled && Boolean(getAiProvider());
};

export const buildPolicySuggestionUpdate = (ticket, suggestion, { applyEffectiveFields = true } = {}) => {
  const update = {
    policyCategory: suggestion.category,
    policyPriority: suggestion.priority,
    policyPriorityRationale: suggestion.priorityRationale,
    policyRuleId: suggestion.ruleId,
    suggestionSource: SUGGESTION_SOURCES.POLICY_RULES,
    aiProcessingStatus: isAiClassificationEnabled()
      ? AI_PROCESSING_STATUSES.PENDING
      : AI_PROCESSING_STATUSES.SKIPPED,
    aiError: null,
  };

  if (applyEffectiveFields) {
    if (!ticket.category) {
      update.category = suggestion.category;
    }

    if (!ticket.priorityOverride) {
      update.priority = suggestion.priority;
    }
  }

  return update;
};

export const applyPolicySuggestionToTicket = async (
  ticketId,
  { actorId = null, applyEffectiveFields = true } = {},
) => {
  const ticket = await Ticket.findById(ticketId);

  if (!ticket) {
    return null;
  }

  const suggestion = suggestTicketClassification({
    subject: ticket.subject,
    description: ticket.description,
  });

  const update = buildPolicySuggestionUpdate(ticket, suggestion, { applyEffectiveFields });

  await Ticket.updateOne({ _id: ticket._id }, { $set: update });

  if (actorId) {
    await AuditLog.create({
      ticket: ticket._id,
      actor: actorId,
      action: AUDIT_ACTIONS.POLICY_SUGGESTION_APPLIED,
      metadata: {
        ruleId: suggestion.ruleId,
        suggestedCategory: suggestion.category,
        suggestedPriority: suggestion.priority,
        suggestionSource: SUGGESTION_SOURCES.POLICY_RULES,
        knowledgeBaseReferences: suggestion.knowledgeBaseReferences,
      },
    });
  }

  return {
    ...suggestion,
    suggestionSource: SUGGESTION_SOURCES.POLICY_RULES,
  };
};

export default {
  buildPolicySuggestionUpdate,
  applyPolicySuggestionToTicket,
};
