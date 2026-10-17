import { describe, it, expect } from '@jest/globals';
import { parseAndValidateAiAnalysisOutput } from '../../../src/modules/ai/aiOutput.schema.js';
import { sampleAiAnalysis } from '../../helpers/aiHelper.js';
import { TICKET_CATEGORIES } from '../../../src/constants/ticketCategory.js';
import { TICKET_PRIORITIES } from '../../../src/constants/ticketPriority.js';

describe('AI output schema', () => {
  it('validates a normalized analysis payload', () => {
    const result = parseAndValidateAiAnalysisOutput(sampleAiAnalysis());

    expect(result.category).toBe(TICKET_CATEGORIES.ROYALTY_PAYMENTS);
    expect(result.priority).toBe(TICKET_PRIORITIES.HIGH);
    expect(result.knowledgeBaseReferences).toEqual(['royalty-payout', 'communication-tone']);
  });

  it('parses JSON string responses before validation', () => {
    const result = parseAndValidateAiAnalysisOutput(JSON.stringify(sampleAiAnalysis()));

    expect(result.draftResponse).toContain('Thank you for contacting BookLeaf');
  });

  it('rejects invalid category enums', () => {
    expect(() =>
      parseAndValidateAiAnalysisOutput(
        sampleAiAnalysis({ category: 'Invalid Category' }),
      ),
    ).toThrow(/AI output validation failed/);
  });

  it('rejects invalid priority enums', () => {
    expect(() =>
      parseAndValidateAiAnalysisOutput(sampleAiAnalysis({ priority: 'URGENT' })),
    ).toThrow(/AI output validation failed/);
  });

  it('rejects invalid knowledge base references', () => {
    expect(() =>
      parseAndValidateAiAnalysisOutput(
        sampleAiAnalysis({ knowledgeBaseReferences: ['unknown-policy'] }),
      ),
    ).toThrow(/Invalid knowledge base references/);
  });

  it('rejects malformed JSON strings', () => {
    expect(() => parseAndValidateAiAnalysisOutput('{not-json')).toThrow();
  });

  it('rejects missing required fields', () => {
    const { draftResponse, ...partial } = sampleAiAnalysis();

    expect(() => parseAndValidateAiAnalysisOutput(partial)).toThrow(/AI output validation failed/);
  });

  it('rejects oversized draft responses', () => {
    expect(() =>
      parseAndValidateAiAnalysisOutput(
        sampleAiAnalysis({ draftResponse: 'x'.repeat(10001) }),
      ),
    ).toThrow(/AI output validation failed/);
  });
});
