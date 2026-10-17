import { describe, it, expect } from '@jest/globals';
import {
  suggestTicketClassification,
  isRoutineQuestion,
  isRoutineProfileUpdate,
  POLICY_RULE_IDS,
} from '../../../src/modules/tickets/priorityPolicy.service.js';
import { TICKET_CATEGORIES } from '../../../src/constants/ticketCategory.js';
import { TICKET_PRIORITIES } from '../../../src/constants/ticketPriority.js';

describe('priorityPolicy.service', () => {
  it('classifies routine royalty timeline questions as low priority', () => {
    const result = suggestTicketClassification({
      subject: 'Royalty payout timing',
      description: 'When will my quarterly royalty payout be processed?',
    });

    expect(result.category).toBe(TICKET_CATEGORIES.ROYALTY_PAYMENTS);
    expect(result.priority).toBe(TICKET_PRIORITIES.LOW);
    expect(result.ruleId).toBe(POLICY_RULE_IDS.ROUTINE_POLICY_CLARIFICATION);
    expect(result.knowledgeBaseReferences).toContain('royalty-payout');
  });

  it('classifies author name update requests as low priority', () => {
    const result = suggestTicketClassification({
      subject: 'How do I update my author name?',
      description: 'Please let me know the process for changing the name shown on my book page.',
    });

    expect(result.category).toBe(TICKET_CATEGORIES.GENERAL_INQUIRY);
    expect(result.priority).toBe(TICKET_PRIORITIES.LOW);
    expect(result.ruleId).toBe(POLICY_RULE_IDS.ROUTINE_PROFILE_UPDATE);
  });

  it('classifies author biography update requests as low priority', () => {
    const result = suggestTicketClassification({
      subject: 'How can I update my author biography?',
      description:
        'I would like to update the author biography displayed on my book page. Please let me know where I can submit the revised biography and whether any approval is required.',
    });

    expect(result.category).toBe(TICKET_CATEGORIES.GENERAL_INQUIRY);
    expect(result.priority).toBe(TICKET_PRIORITIES.LOW);
    expect(result.ruleId).toBe(POLICY_RULE_IDS.ROUTINE_PROFILE_UPDATE);
  });

  it('escalates missing overdue royalty payments to critical', () => {
    const result = suggestTicketClassification({
      subject: 'Payout still missing',
      description:
        'My royalty payment was not received and the quarter ended more than 45 days ago. This is urgent.',
    });

    expect(result.priority).toBe(TICKET_PRIORITIES.CRITICAL);
    expect(result.ruleId).toBe(POLICY_RULE_IDS.ROYALTY_CRITICAL_PAYMENT_DISRUPTION);
  });

  it('escalates ISBN errors to high priority', () => {
    const result = suggestTicketClassification({
      subject: 'Wrong ISBN on listing',
      description: 'The ISBN on my book listing is incorrect and needs escalation to production.',
    });

    expect(result.category).toBe(TICKET_CATEGORIES.ISBN_METADATA);
    expect(result.priority).toBe(TICKET_PRIORITIES.HIGH);
    expect(result.ruleId).toBe(POLICY_RULE_IDS.ISBN_HIGH_ESCALATION);
  });

  it('classifies verified printing defects as high priority', () => {
    const result = suggestTicketClassification({
      subject: 'Damaged copies received',
      description: 'Several books from my latest order arrived with printing defects and misprints.',
    });

    expect(result.category).toBe(TICKET_CATEGORIES.PRINTING_QUALITY);
    expect(result.priority).toBe(TICKET_PRIORITIES.HIGH);
    expect(result.ruleId).toBe(POLICY_RULE_IDS.PRINTING_HIGH_DEFECT);
  });

  it('treats policy timeline delays as medium priority', () => {
    const result = suggestTicketClassification({
      subject: 'Listing still pending',
      description: 'My Amazon listing is still waiting past the documented 7-10 business day timeline.',
    });

    expect(result.category).toBe(TICKET_CATEGORIES.DISTRIBUTION_AVAILABILITY);
    expect(result.priority).toBe(TICKET_PRIORITIES.MEDIUM);
    expect(result.ruleId).toBe(POLICY_RULE_IDS.POLICY_TIMELINE_EXCEEDED);
  });

  it('uses medium fallback for ambiguous non-routine requests', () => {
    const result = suggestTicketClassification({
      subject: 'Need help with my account',
      description: 'Something seems off with my account settings and I need support.',
    });

    expect(result.priority).toBe(TICKET_PRIORITIES.MEDIUM);
    expect(result.ruleId).toBe(POLICY_RULE_IDS.DEFAULT_CATEGORY_REVIEW);
  });

  it('identifies routine questions without escalation language', () => {
    expect(isRoutineQuestion('How long does metadata update take?')).toBe(true);
    expect(isRoutineQuestion('My royalty payment was not received and is overdue')).toBe(false);
  });

  it('identifies routine profile updates', () => {
    expect(isRoutineProfileUpdate('How can I update my author biography?')).toBe(true);
    expect(isRoutineProfileUpdate('The ISBN on my listing is incorrect')).toBe(false);
  });
});
