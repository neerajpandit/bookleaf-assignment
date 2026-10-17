import { describe, it, expect } from '@jest/globals';
import { createOpenAiProvider } from '../../../src/modules/ai/providers/openai.provider.js';
import { createOllamaProvider } from '../../../src/modules/ai/providers/ollama.provider.js';
import {
  createOpenAiFetchMock,
  createOllamaFetchMock,
  sampleAiAnalysis,
} from '../../helpers/aiHelper.js';
import { TICKET_CATEGORIES } from '../../../src/constants/ticketCategory.js';
import { TICKET_PRIORITIES } from '../../../src/constants/ticketPriority.js';

const baseInput = {
  ticket: {
    ticketNumber: 'TKT-1001',
    subject: 'Royalty payout delay',
    description: 'My royalty payout is still pending.',
  },
  conversation: [{ senderRole: 'AUTHOR', body: 'My royalty payout is still pending.' }],
  bookContext: { bookId: 'BK001', title: 'Sample Book', status: 'Published' },
  knowledgeBase: [{ id: 'royalty-payout', title: 'Royalty Policy', body: 'Payouts are monthly.' }],
};

describe('AI provider contract', () => {
  it('returns the same normalized output from the OpenAI adapter', async () => {
    const provider = createOpenAiProvider({
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      fetchImpl: createOpenAiFetchMock(sampleAiAnalysis()),
      timeoutMs: 5000,
    });

    const result = await provider.generateTicketAnalysis(baseInput);

    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-4o-mini');
    expect(result.data).toEqual(sampleAiAnalysis());
  });

  it('returns the same normalized output from the Ollama adapter', async () => {
    const provider = createOllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.2',
      fetchImpl: createOllamaFetchMock(sampleAiAnalysis()),
      timeoutMs: 5000,
    });

    const result = await provider.generateTicketAnalysis(baseInput);

    expect(result.provider).toBe('ollama');
    expect(result.model).toBe('llama3.2');
    expect(result.data).toEqual(sampleAiAnalysis());
  });

  it('rejects invalid model responses in both adapters', async () => {
    const invalidAnalysis = sampleAiAnalysis({ category: 'Not Allowed' });

    const openAiProvider = createOpenAiProvider({
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      fetchImpl: createOpenAiFetchMock(invalidAnalysis),
    });

    const ollamaProvider = createOllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.2',
      fetchImpl: createOllamaFetchMock(invalidAnalysis),
    });

    await expect(openAiProvider.generateTicketAnalysis(baseInput)).rejects.toThrow(
      /AI output validation failed/,
    );
    await expect(ollamaProvider.generateTicketAnalysis(baseInput)).rejects.toThrow(
      /AI output validation failed/,
    );
  });

  it('surfaces provider timeouts without switching providers', async () => {
    const openAiProvider = createOpenAiProvider({
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      fetchImpl: createOpenAiFetchMock(sampleAiAnalysis(), { delayMs: 50 }),
      timeoutMs: 10,
    });

    await expect(openAiProvider.generateTicketAnalysis(baseInput)).rejects.toThrow(
      /OpenAI request timed out/,
    );
  });

  it('surfaces unavailable provider responses as controlled failures', async () => {
    const openAiProvider = createOpenAiProvider({
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      fetchImpl: createOpenAiFetchMock(sampleAiAnalysis(), { failWithStatus: 503 }),
    });

    const ollamaProvider = createOllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.2',
      fetchImpl: createOllamaFetchMock(sampleAiAnalysis(), { failWithStatus: 503 }),
    });

    await expect(openAiProvider.generateTicketAnalysis(baseInput)).rejects.toThrow(
      /OpenAI request failed with status 503/,
    );
    await expect(ollamaProvider.generateTicketAnalysis(baseInput)).rejects.toThrow(
      /Ollama request failed with status 503/,
    );
  });

  it('accepts enum values defined by the assignment', async () => {
    const analysis = sampleAiAnalysis({
      category: TICKET_CATEGORIES.GENERAL_INQUIRY,
      priority: TICKET_PRIORITIES.LOW,
      knowledgeBaseReferences: ['communication-tone'],
    });

    const provider = createOpenAiProvider({
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      fetchImpl: createOpenAiFetchMock(analysis),
    });

    const result = await provider.generateTicketAnalysis(baseInput);

    expect(result.data.category).toBe(TICKET_CATEGORIES.GENERAL_INQUIRY);
    expect(result.data.priority).toBe(TICKET_PRIORITIES.LOW);
  });
});
