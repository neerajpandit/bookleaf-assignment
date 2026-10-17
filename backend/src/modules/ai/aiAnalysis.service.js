import Ticket from '../tickets/ticket.model.js';
import TicketMessage from '../tickets/ticketMessage.model.js';
import Book from '../books/book.model.js';
import AuditLog from '../audit-logs/auditLog.model.js';
import { AI_PROCESSING_STATUSES } from '../../constants/aiProcessingStatus.js';
import { AUDIT_ACTIONS } from '../../constants/auditActions.js';
import { AI_PROVIDERS } from '../../constants/aiProviders.js';
import { getRelevantKnowledgeBase } from '../knowledge-base/knowledgeBase.service.js';
import { getAiProvider } from './aiProviderFactory.js';
import { loadAiConfig } from './aiConfig.js';
import { SUGGESTION_SOURCES } from '../../constants/suggestionSource.js';
import { isTransientAiError } from './aiErrors.js';
import { hasValidAiDraftForTicket } from './aiDraftLifecycle.js';
import { enqueueTicketClassification } from './classificationQueue.js';

const BACKGROUND_CLAIMABLE_STATUSES = [
  AI_PROCESSING_STATUSES.PENDING,
  AI_PROCESSING_STATUSES.SKIPPED,
  AI_PROCESSING_STATUSES.FAILED,
  AI_PROCESSING_STATUSES.COMPLETED,
];

const ANALYSIS_MODES = {
  FULL: 'full',
  CLASSIFICATION: 'classification',
  DRAFT: 'draft',
};

const MAX_TRANSIENT_RETRIES = 2;
const RETRY_DELAY_MS = 500;
const ANALYSIS_WAIT_POLL_MS = 250;
const ANALYSIS_WAIT_MAX_MS = 65000;

const sanitizeAiError = (error) => {
  const message = error?.message || 'AI processing failed';
  return message.slice(0, 500);
};

const resolveSuggestionSource = (providerName) => {
  if (providerName === AI_PROVIDERS.OLLAMA) {
    return SUGGESTION_SOURCES.OLLAMA;
  }

  if (providerName === AI_PROVIDERS.OPENAI) {
    return SUGGESTION_SOURCES.OPENAI;
  }

  return providerName;
};

const buildBookContext = async (ticket) => {
  if (!ticket.book) {
    return null;
  }

  const book = ticket.book.bookId
    ? ticket.book
    : await Book.findById(ticket.book).select('bookId title status');

  if (!book) {
    return null;
  }

  return {
    bookId: book.bookId,
    title: book.title,
    status: book.status,
  };
};

const buildStaleContextFilter = (contextLastMessageAt) => {
  if (contextLastMessageAt === null || contextLastMessageAt === undefined) {
    return { $or: [{ lastMessageAt: null }, { lastMessageAt: { $exists: false } }] };
  }

  return { lastMessageAt: contextLastMessageAt };
};

const claimAnalysisJob = async (ticketId, { isAdminRequest = false } = {}) => {
  const statusFilter = isAdminRequest
    ? { aiProcessingStatus: { $ne: AI_PROCESSING_STATUSES.IN_PROGRESS } }
    : { aiProcessingStatus: { $in: BACKGROUND_CLAIMABLE_STATUSES } };

  const ticket = await Ticket.findOneAndUpdate(
    { _id: ticketId, ...statusFilter },
    {
      $set: {
        aiProcessingStatus: AI_PROCESSING_STATUSES.IN_PROGRESS,
        aiError: null,
      },
    },
    { new: true },
  );

  if (!ticket) {
    return null;
  }

  return {
    ticket,
    contextLastMessageAt: ticket.lastMessageAt ?? null,
  };
};

const buildPersistedAnalysisUpdate = (
  currentTicket,
  analysisResult,
  { analysisMode, contextLastMessageAt },
) => {
  const { data, provider, model } = analysisResult;
  const update = {
    aiProvider: provider,
    aiModel: model,
    aiProcessedAt: new Date(),
    aiProcessingStatus: AI_PROCESSING_STATUSES.COMPLETED,
    aiError: null,
    suggestionSource: resolveSuggestionSource(provider),
  };

  const includeClassification =
    analysisMode === ANALYSIS_MODES.FULL || analysisMode === ANALYSIS_MODES.CLASSIFICATION;
  const includeDraft = analysisMode === ANALYSIS_MODES.FULL || analysisMode === ANALYSIS_MODES.DRAFT;

  if (includeClassification) {
    update.aiCategory = data.category;
    update.aiPriority = data.priority;
    update.aiPriorityRationale = data.priorityRationale;
    update.aiKnowledgeBaseReferences = data.knowledgeBaseReferences;
    update.aiNeedsHumanReview = data.needsHumanReview;
  }

  if (includeDraft) {
    update.aiDraftResponse = data.draftResponse;
    update.aiDraftContextLastMessageAt = contextLastMessageAt ?? currentTicket.lastMessageAt ?? null;
    update.aiNeedsHumanReview = data.needsHumanReview;
  }

  return update;
};

const persistSuccessfulAnalysis = async (
  ticketId,
  analysisResult,
  {
    auditAction,
    actorId,
    contextLastMessageAt,
    skipStaleCheck = false,
    latencyMs = null,
    analysisMode = ANALYSIS_MODES.FULL,
  },
) => {
  const { data, provider, model, usage } = analysisResult;
  const currentTicket = await Ticket.findById(ticketId);

  if (!currentTicket) {
    return false;
  }

  const update = buildPersistedAnalysisUpdate(currentTicket, analysisResult, {
    analysisMode,
    contextLastMessageAt,
  });

  const filter = { _id: ticketId };

  if (!skipStaleCheck) {
    Object.assign(filter, buildStaleContextFilter(contextLastMessageAt));
  }

  const result = await Ticket.updateOne(filter, { $set: update });

  if (result.matchedCount === 0) {
    await Ticket.updateOne(
      { _id: ticketId, aiProcessingStatus: AI_PROCESSING_STATUSES.IN_PROGRESS },
      {
        $set: {
          aiProcessingStatus:
            currentTicket.suggestionSource === SUGGESTION_SOURCES.POLICY_RULES
              ? AI_PROCESSING_STATUSES.SKIPPED
              : AI_PROCESSING_STATUSES.COMPLETED,
          aiError: null,
        },
      },
    );
    return false;
  }

  await AuditLog.create({
    ticket: ticketId,
    actor: actorId,
    action: auditAction,
    metadata: {
      provider,
      model,
      analysisMode,
      needsHumanReview: data.needsHumanReview,
      knowledgeBaseReferences: data.knowledgeBaseReferences,
      latencyMs,
      promptTokens: usage?.promptTokens ?? null,
      completionTokens: usage?.completionTokens ?? null,
      totalTokens: usage?.totalTokens ?? null,
      staleCheckApplied: !skipStaleCheck,
    },
  });

  return true;
};

const persistFailedAnalysis = async (
  ticketId,
  error,
  {
    auditAction,
    actorId,
    contextLastMessageAt,
    skipStaleCheck = false,
    latencyMs = null,
    analysisMode = ANALYSIS_MODES.FULL,
  },
) => {
  const currentTicket = await Ticket.findById(ticketId);

  if (!currentTicket) {
    return false;
  }

  const filter = { _id: ticketId };

  if (!skipStaleCheck) {
    Object.assign(filter, buildStaleContextFilter(contextLastMessageAt));
  }

  const result = await Ticket.updateOne(filter, {
    $set: {
      aiProcessingStatus: AI_PROCESSING_STATUSES.FAILED,
      aiError: sanitizeAiError(error),
    },
  });

  if (result.matchedCount === 0) {
    const revertStatus =
      currentTicket.suggestionSource === SUGGESTION_SOURCES.POLICY_RULES
        ? AI_PROCESSING_STATUSES.SKIPPED
        : currentTicket.aiProcessingStatus;

    await Ticket.updateOne(
      { _id: ticketId, aiProcessingStatus: AI_PROCESSING_STATUSES.IN_PROGRESS },
      {
        $set: {
          aiProcessingStatus: revertStatus,
        },
      },
    );
    return false;
  }

  await AuditLog.create({
    ticket: ticketId,
    actor: actorId,
    action: auditAction,
    metadata: {
      reason: sanitizeAiError(error),
      latencyMs,
      analysisMode,
      retryable: isTransientAiError(error),
    },
  });

  return true;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const invokeProviderWithRetries = async (provider, context) => {
  let lastError;

  for (let attempt = 0; attempt <= MAX_TRANSIENT_RETRIES; attempt += 1) {
    const startedAt = Date.now();

    try {
      const analysisResult = await provider.generateTicketAnalysis(context);
      return {
        ...analysisResult,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      lastError = error;

      if (!isTransientAiError(error) || attempt === MAX_TRANSIENT_RETRIES) {
        throw error;
      }

      await sleep(RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError;
};

const waitForAnalysisCompletion = async (ticketId) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < ANALYSIS_WAIT_MAX_MS) {
    const ticket = await Ticket.findById(ticketId);

    if (!ticket || ticket.aiProcessingStatus !== AI_PROCESSING_STATUSES.IN_PROGRESS) {
      return ticket;
    }

    await sleep(ANALYSIS_WAIT_POLL_MS);
  }

  return Ticket.findById(ticketId);
};

export const isAiProcessingAvailable = () => {
  const config = loadAiConfig();
  return config.enabled && Boolean(getAiProvider());
};

export const analyzeTicketById = async (
  ticketId,
  {
    auditAction = AUDIT_ACTIONS.AI_CLASSIFICATION_COMPLETED,
    failureAuditAction = AUDIT_ACTIONS.AI_CLASSIFICATION_FAILED,
    actorId = null,
    skipStaleCheck = false,
    isAdminRequest = false,
    analysisMode = ANALYSIS_MODES.FULL,
  } = {},
) => {
  if (!isAiProcessingAvailable()) {
    return null;
  }

  const provider = getAiProvider();

  if (!provider) {
    return null;
  }

  const claim = await claimAnalysisJob(ticketId, { isAdminRequest });

  if (!claim) {
    return null;
  }

  const { ticket, contextLastMessageAt } = claim;
  const resolvedActorId = actorId ?? ticket.author;
  let latencyMs = null;

  try {
    const conversation = await TicketMessage.find({ ticket: ticketId }).sort({
      createdAt: 1,
      _id: 1,
    });
    const [bookContext, knowledgeBase] = await Promise.all([
      buildBookContext(ticket),
      getRelevantKnowledgeBase({ ticket, conversation }),
    ]);

    const analysisResult = await invokeProviderWithRetries(provider, {
      ticket,
      conversation,
      bookContext,
      knowledgeBase,
    });

    latencyMs = analysisResult.latencyMs ?? null;

    const persisted = await persistSuccessfulAnalysis(ticketId, analysisResult, {
      auditAction,
      actorId: resolvedActorId,
      contextLastMessageAt,
      skipStaleCheck,
      latencyMs,
      analysisMode,
    });

    if (!persisted) {
      return null;
    }

    return analysisResult;
  } catch (error) {
    await persistFailedAnalysis(ticketId, error, {
      auditAction: failureAuditAction,
      actorId: resolvedActorId,
      contextLastMessageAt,
      skipStaleCheck,
      latencyMs,
      analysisMode,
    });
    throw error;
  }
};

export const ensureAdminTicketAiDraft = async (adminUserId, ticketId) => {
  if (!isAiProcessingAvailable()) {
    return null;
  }

  let ticket = await Ticket.findById(ticketId);

  if (!ticket) {
    return null;
  }

  if (hasValidAiDraftForTicket(ticket)) {
    return ticket;
  }

  if (ticket.aiProcessingStatus === AI_PROCESSING_STATUSES.IN_PROGRESS) {
    ticket = await waitForAnalysisCompletion(ticketId);

    if (ticket && hasValidAiDraftForTicket(ticket)) {
      return ticket;
    }
  }

  try {
    await analyzeTicketById(ticketId, {
      auditAction: AUDIT_ACTIONS.AI_DRAFT_GENERATED,
      failureAuditAction: AUDIT_ACTIONS.AI_DRAFT_FAILED,
      actorId: adminUserId,
      skipStaleCheck: true,
      isAdminRequest: true,
      analysisMode: ANALYSIS_MODES.DRAFT,
    });
  } catch {
    // Manual admin workflow remains available when draft generation fails.
  }

  return Ticket.findById(ticketId);
};

export const queueTicketAnalysis = (ticketId) => {
  if (!isAiProcessingAvailable()) {
    return false;
  }

  return enqueueTicketClassification(ticketId, () =>
    analyzeTicketById(ticketId, {
      analysisMode: ANALYSIS_MODES.CLASSIFICATION,
    }),
  );
};

export const regenerateAdminAiDraft = async (adminUserId, ticketId) => {
  const ticket = await Ticket.findById(ticketId);

  if (!ticket) {
    return null;
  }

  return analyzeTicketById(ticketId, {
    auditAction: AUDIT_ACTIONS.AI_DRAFT_GENERATED,
    failureAuditAction: AUDIT_ACTIONS.AI_DRAFT_FAILED,
    actorId: adminUserId,
    skipStaleCheck: true,
    isAdminRequest: true,
    analysisMode: ANALYSIS_MODES.DRAFT,
  });
};

export default {
  analyzeTicketById,
  ensureAdminTicketAiDraft,
  queueTicketAnalysis,
  regenerateAdminAiDraft,
};
