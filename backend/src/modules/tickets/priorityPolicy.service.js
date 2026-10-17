import { TICKET_CATEGORIES } from '../../constants/ticketCategory.js';
import { TICKET_PRIORITIES } from '../../constants/ticketPriority.js';

export const POLICY_RULE_IDS = {
  ROYALTY_CRITICAL_PAYMENT_DISRUPTION: 'royalty-critical-payment-disruption',
  PUBLISHING_BLOCKAGE: 'publishing-blockage',
  ISBN_HIGH_ESCALATION: 'isbn-high-escalation',
  ROYALTY_HIGH_DISCREPANCY: 'royalty-high-discrepancy',
  PRINTING_HIGH_DEFECT: 'printing-high-defect',
  POLICY_TIMELINE_EXCEEDED: 'policy-timeline-exceeded',
  INVESTIGATION_REQUIRED: 'investigation-required',
  ROUTINE_PROFILE_UPDATE: 'routine-profile-update',
  ROUTINE_POLICY_CLARIFICATION: 'routine-policy-clarification',
  DEFAULT_CATEGORY_REVIEW: 'default-category-review',
};

const ROUTINE_PATTERNS = [
  /\bwhen (will|do|does|is|are)\b/i,
  /\bhow (long|do|does|can)\b/i,
  /\bwhat is (the|my)\b/i,
  /\bwhere (can|do|should) i\b/i,
  /\bplease let me know\b/i,
  /\bclarify\b/i,
  /\bprocess for\b/i,
  /\btimeline for\b/i,
  /\bpolicy on\b/i,
  /\bcan you explain\b/i,
  /\bwhether (any )?approval (is )?required\b/i,
];

const ROUTINE_PROFILE_PATTERNS = [
  /\bauthor (name|biography|bio|profile|photo|headshot|image)\b/i,
  /\bupdate (my )?(author )?(name|biography|bio|profile)\b/i,
  /\bchange (my )?(author )?(name|biography|bio|profile)\b/i,
  /\bhow (do|can) i update (my )?(author )?(name|biography|bio|profile)\b/i,
  /\brevised (biography|bio|profile|author name)\b/i,
];

const ESCALATION_PATTERNS = [
  /\bnot received\b/i,
  /\bnever received\b/i,
  /\bincorrect\b/i,
  /\bwrong amount\b/i,
  /\bdiscrepan/i,
  /\berror\b/i,
  /\binvalid\b/i,
  /\bdefect\b/i,
  /\bdamaged\b/i,
  /\bmisprint\b/i,
  /\burgent\b/i,
  /\bcritical\b/i,
  /\bblocked\b/i,
  /\boverdue\b/i,
  /\bescalat/i,
  /\bmissing payment\b/i,
  /\bcannot publish\b/i,
  /\bpublication blocked\b/i,
];

const CATEGORY_DEFINITIONS = [
  {
    category: TICKET_CATEGORIES.ROYALTY_PAYMENTS,
    knowledgeBaseId: 'royalty-payout',
    keywords: ['royalty', 'payout', 'payment', 'paid', 'quarter', 'rupee', '1000', '₹', 'net profit'],
  },
  {
    category: TICKET_CATEGORIES.ISBN_METADATA,
    knowledgeBaseId: 'isbn-metadata',
    keywords: ['isbn', 'metadata', 'barcode', 'catalog', 'title update', 'author name', 'author biography', 'biography', 'bio'],
  },
  {
    category: TICKET_CATEGORIES.PRINTING_QUALITY,
    knowledgeBaseId: 'printing-quality',
    keywords: ['print', 'printing', 'reprint', 'defect', 'quality', 'cover damage', 'misprint'],
  },
  {
    category: TICKET_CATEGORIES.DISTRIBUTION_AVAILABILITY,
    knowledgeBaseId: 'distribution-availability',
    keywords: ['distribution', 'listing', 'amazon', 'flipkart', 'availability', 'stock', 'sync'],
  },
  {
    category: TICKET_CATEGORIES.BOOK_STATUS_PRODUCTION,
    knowledgeBaseId: 'book-production',
    keywords: ['production', 'typesetting', 'cover design', 'publication', 'milestone', 'in production'],
  },
];

const normalizeText = (subject = '', description = '') =>
  `${subject} ${description}`.trim().toLowerCase();

const includesAny = (text, patterns) => patterns.some((pattern) => pattern.test(text));

const countKeywordMatches = (text, keywords) =>
  keywords.reduce((count, keyword) => (text.includes(keyword) ? count + 1 : count), 0);

export const isRoutineProfileUpdate = (text) =>
  includesAny(text, ROUTINE_PROFILE_PATTERNS) && !includesAny(text, ESCALATION_PATTERNS);

export const isRoutineQuestion = (text) =>
  includesAny(text, ROUTINE_PATTERNS) && !includesAny(text, ESCALATION_PATTERNS);

export const detectTicketCategory = (text) => {
  if (isRoutineProfileUpdate(text)) {
    return {
      category: TICKET_CATEGORIES.GENERAL_INQUIRY,
      knowledgeBaseId: 'communication-tone',
      score: 1,
    };
  }

  let bestMatch = {
    category: TICKET_CATEGORIES.GENERAL_INQUIRY,
    knowledgeBaseId: 'communication-tone',
    score: 0,
  };

  CATEGORY_DEFINITIONS.forEach((definition) => {
    const score = countKeywordMatches(text, definition.keywords);
    if (score > bestMatch.score) {
      bestMatch = {
        category: definition.category,
        knowledgeBaseId: definition.knowledgeBaseId,
        score,
      };
    }
  });

  return bestMatch;
};

export const evaluatePriorityForCategory = (text, category) => {
  const routine = isRoutineQuestion(text);

  if (isRoutineProfileUpdate(text)) {
    return {
      priority: TICKET_PRIORITIES.LOW,
      ruleId: POLICY_RULE_IDS.ROUTINE_PROFILE_UPDATE,
      rationale:
        'Routine author profile or biography update request without evidence of urgent business impact.',
    };
  }

  if (
    category === TICKET_CATEGORIES.ROYALTY_PAYMENTS &&
    /\b(not received|never received|missing payment|payment missing)\b/i.test(text) &&
    /\b(overdue|45 day|quarter ended|past due|urgent|critical|still waiting)\b/i.test(text)
  ) {
    return {
      priority: TICKET_PRIORITIES.CRITICAL,
      ruleId: POLICY_RULE_IDS.ROYALTY_CRITICAL_PAYMENT_DISRUPTION,
      rationale:
        'Confirmed or strongly evidenced royalty payment disruption beyond the quarterly 45-day payout window.',
    };
  }

  if (
    /\b(cannot publish|publication blocked|blocked from publishing|major blockage)\b/i.test(text) ||
    (category === TICKET_CATEGORIES.ISBN_METADATA &&
      /\b(error|invalid|wrong)\b/i.test(text) &&
      /\b(publish|publication|block|stop)\b/i.test(text))
  ) {
    return {
      priority: TICKET_PRIORITIES.CRITICAL,
      ruleId: POLICY_RULE_IDS.PUBLISHING_BLOCKAGE,
      rationale: 'Major publishing blockage requiring immediate operations attention.',
    };
  }

  if (
    category === TICKET_CATEGORIES.ISBN_METADATA &&
    /\b(error|incorrect|wrong|invalid|fix|escalat)\b/i.test(text) &&
    !routine
  ) {
    return {
      priority: TICKET_PRIORITIES.HIGH,
      ruleId: POLICY_RULE_IDS.ISBN_HIGH_ESCALATION,
      rationale: 'ISBN or metadata error requiring escalation to production operations.',
    };
  }

  if (
    category === TICKET_CATEGORIES.ROYALTY_PAYMENTS &&
    /\b(discrepan|incorrect amount|wrong amount|missing payment|not received|short paid)\b/i.test(
      text,
    ) &&
    !routine
  ) {
    return {
      priority: TICKET_PRIORITIES.HIGH,
      ruleId: POLICY_RULE_IDS.ROYALTY_HIGH_DISCREPANCY,
      rationale: 'Significant royalty or payment discrepancy requiring review.',
    };
  }

  if (
    category === TICKET_CATEGORIES.PRINTING_QUALITY &&
    /\b(defect|damaged|misprint|quality issue|poor print)\b/i.test(text) &&
    /\b(order|copy|book|received|shipment)\b/i.test(text)
  ) {
    return {
      priority: TICKET_PRIORITIES.HIGH,
      ruleId: POLICY_RULE_IDS.PRINTING_HIGH_DEFECT,
      rationale: 'Verified or reported printing defect with material impact on delivered copies.',
    };
  }

  if (
    /\b(delay|delayed|overdue|still waiting|past)\b/i.test(text) &&
    /\b(45 day|7 day|10 day|14 day|business day|3-5 day|24-48 hour)\b/i.test(text) &&
    !routine
  ) {
    return {
      priority: TICKET_PRIORITIES.MEDIUM,
      ruleId: POLICY_RULE_IDS.POLICY_TIMELINE_EXCEEDED,
      rationale: 'Issue references a delay beyond documented policy timelines and needs follow-up.',
    };
  }

  if (
    /\b(investigate|follow up|follow-up|pending review|status update)\b/i.test(text) &&
    !routine
  ) {
    return {
      priority: TICKET_PRIORITIES.MEDIUM,
      ruleId: POLICY_RULE_IDS.INVESTIGATION_REQUIRED,
      rationale: 'Issue needs investigation or follow-up without immediate severe business impact.',
    };
  }

  if (routine) {
    return {
      priority: TICKET_PRIORITIES.LOW,
      ruleId: POLICY_RULE_IDS.ROUTINE_POLICY_CLARIFICATION,
      rationale: 'Routine policy or process clarification without evidence of severe impact.',
    };
  }

  return {
    priority: TICKET_PRIORITIES.MEDIUM,
    ruleId: POLICY_RULE_IDS.DEFAULT_CATEGORY_REVIEW,
    rationale: 'Standard support issue requiring review under the matched category policy.',
  };
};

export const suggestTicketClassification = ({ subject = '', description = '' } = {}) => {
  const text = normalizeText(subject, description);
  const { category, knowledgeBaseId } = detectTicketCategory(text);
  const priorityResult = evaluatePriorityForCategory(text, category);

  return {
    category,
    priority: priorityResult.priority,
    priorityRationale: priorityResult.rationale,
    ruleId: priorityResult.ruleId,
    knowledgeBaseReferences: [knowledgeBaseId],
  };
};

export default {
  POLICY_RULE_IDS,
  isRoutineProfileUpdate,
  isRoutineQuestion,
  detectTicketCategory,
  evaluatePriorityForCategory,
  suggestTicketClassification,
};
