import { describe, it, expect } from '@jest/globals';
import {
  conversationVersionsMatch,
  hasValidAiDraftForTicket,
  invalidateAiDraftAfterConversationUpdate,
} from '../../../src/modules/ai/aiDraftLifecycle.js';

describe('aiDraftLifecycle', () => {
  describe('hasValidAiDraftForTicket', () => {
    it('returns true when draft text matches the current conversation version', () => {
      const timestamp = new Date('2024-03-01T00:00:00.000Z');

      expect(
        hasValidAiDraftForTicket({
          aiDraftResponse: 'Saved draft',
          aiDraftContextLastMessageAt: timestamp,
          lastMessageAt: new Date('2024-03-01T00:00:00.000Z'),
        }),
      ).toBe(true);
    });

    it('returns false when conversation changed after the draft was saved', () => {
      expect(
        hasValidAiDraftForTicket({
          aiDraftResponse: 'Saved draft',
          aiDraftContextLastMessageAt: new Date('2024-03-01T00:00:00.000Z'),
          lastMessageAt: new Date('2024-04-01T00:00:00.000Z'),
        }),
      ).toBe(false);
    });
  });

  describe('conversationVersionsMatch', () => {
    it('treats null timestamps as equal', () => {
      expect(conversationVersionsMatch(null, null)).toBe(true);
    });
  });

  describe('invalidateAiDraftAfterConversationUpdate', () => {
    it('clears draft output and flags human review when AI output existed', () => {
      const ticket = {
        aiDraftResponse: 'Suggested reply',
        aiDraftContextLastMessageAt: new Date('2024-01-01T00:00:00.000Z'),
        aiProcessedAt: new Date('2024-01-01T00:00:00.000Z'),
        aiNeedsHumanReview: false,
      };

      const changed = invalidateAiDraftAfterConversationUpdate(ticket);

      expect(changed).toBe(true);
      expect(ticket.aiDraftResponse).toBeNull();
      expect(ticket.aiDraftContextLastMessageAt).toBeNull();
      expect(ticket.aiNeedsHumanReview).toBe(true);
    });

    it('does nothing when no prior AI output exists', () => {
      const ticket = {
        aiDraftResponse: null,
        aiDraftContextLastMessageAt: null,
        aiProcessedAt: null,
        aiNeedsHumanReview: false,
      };

      const changed = invalidateAiDraftAfterConversationUpdate(ticket);

      expect(changed).toBe(false);
      expect(ticket.aiDraftResponse).toBeNull();
      expect(ticket.aiNeedsHumanReview).toBe(false);
    });
  });
});
