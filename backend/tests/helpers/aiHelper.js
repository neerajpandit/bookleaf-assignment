import { jest } from '@jest/globals';
import { TICKET_CATEGORIES } from '../../src/constants/ticketCategory.js';
import { TICKET_PRIORITIES } from '../../src/constants/ticketPriority.js';

export const sampleAiAnalysis = (overrides = {}) => ({
  category: TICKET_CATEGORIES.ROYALTY_PAYMENTS,
  priority: TICKET_PRIORITIES.HIGH,
  priorityRationale: 'Delayed royalty payout requires finance review.',
  draftResponse:
    'Thank you for contacting BookLeaf. We are reviewing your royalty payout and will follow up shortly.',
  knowledgeBaseReferences: ['royalty-payout', 'communication-tone'],
  needsHumanReview: true,
  ...overrides,
});

export const createMockProvider = (analysis = sampleAiAnalysis(), options = {}) => ({
  providerName: options.providerName || 'openai',
  modelName: options.modelName || 'mock-model',
  generateTicketAnalysis: jest.fn(async () => ({
    provider: options.providerName || 'openai',
    model: options.modelName || 'mock-model',
    data: typeof analysis === 'function' ? analysis() : analysis,
    usage: options.usage ?? {
      promptTokens: 120,
      completionTokens: 80,
      totalTokens: 200,
    },
    latencyMs: options.latencyMs ?? 15,
  })),
});

export const createOpenAiFetchMock = (analysis, behavior = {}) => {
  const payload = typeof analysis === 'function' ? analysis : () => analysis;

  return jest.fn(async (url, options = {}) => {
    if (behavior.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, behavior.delayMs));
    }

    if (behavior.failWithStatus) {
      return {
        ok: false,
        status: behavior.failWithStatus,
        json: async () => ({}),
      };
    }

    if (options.signal?.aborted) {
      const error = new Error('Aborted');
      error.name = 'AbortError';
      throw error;
    }

    if (behavior.throwError) {
      throw behavior.throwError;
    }

    if (!url.includes('api.openai.com')) {
      throw new Error(`Unexpected fetch URL: ${url}`);
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(payload()) } }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      }),
    };
  });
};

export const createOllamaFetchMock = (analysis, behavior = {}) => {
  const payload = typeof analysis === 'function' ? analysis : () => analysis;

  return jest.fn(async (url, options = {}) => {
    if (behavior.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, behavior.delayMs));
    }

    if (behavior.failWithStatus) {
      return {
        ok: false,
        status: behavior.failWithStatus,
        json: async () => ({}),
      };
    }

    if (options.signal?.aborted) {
      const error = new Error('Aborted');
      error.name = 'AbortError';
      throw error;
    }

    if (behavior.throwError) {
      throw behavior.throwError;
    }

    if (!url.includes('/api/chat')) {
      throw new Error(`Unexpected fetch URL: ${url}`);
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        message: { content: JSON.stringify(payload()) },
      }),
    };
  });
};

export const flushAsyncQueue = async (iterations = 3) => {
  for (let index = 0; index < iterations; index += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
};
