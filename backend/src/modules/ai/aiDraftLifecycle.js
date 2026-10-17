const normalizeTimestamp = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  return new Date(value).getTime();
};

export const conversationVersionsMatch = (draftContextLastMessageAt, currentLastMessageAt) =>
  normalizeTimestamp(draftContextLastMessageAt) === normalizeTimestamp(currentLastMessageAt);

export const hasValidAiDraftForTicket = (ticket) => {
  if (!ticket?.aiDraftResponse?.trim()) {
    return false;
  }

  return conversationVersionsMatch(ticket.aiDraftContextLastMessageAt, ticket.lastMessageAt);
};

/**
 * Marks AI draft output stale after new public conversation activity.
 * Does not trigger provider calls or change processing status.
 */
export const invalidateAiDraftAfterConversationUpdate = (ticket) => {
  const hadAiOutput = Boolean(ticket.aiDraftResponse) || Boolean(ticket.aiProcessedAt);

  if (!hadAiOutput) {
    return false;
  }

  ticket.aiDraftResponse = null;
  ticket.aiDraftContextLastMessageAt = null;
  ticket.aiNeedsHumanReview = true;
  return true;
};

export default {
  conversationVersionsMatch,
  hasValidAiDraftForTicket,
  invalidateAiDraftAfterConversationUpdate,
};
