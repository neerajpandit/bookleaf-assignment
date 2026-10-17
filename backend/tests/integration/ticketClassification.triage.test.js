import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { setupTestDb, teardownTestDb } from '../setup/testDb.js';
import { clearDatabase } from '../helpers/modelTestHelper.js';
import {
  createTestAuthor,
  createTestAdmin,
  loginDirect,
  samplePassword,
} from '../helpers/authHelper.js';
import { createTestBook } from '../helpers/bookHelper.js';
import { createTestTicket } from '../helpers/ticketHelper.js';
import Ticket from '../../src/modules/tickets/ticket.model.js';
import { TICKET_CATEGORIES } from '../../src/constants/ticketCategory.js';
import { TICKET_PRIORITIES } from '../../src/constants/ticketPriority.js';
import { AI_PROCESSING_STATUSES } from '../../src/constants/aiProcessingStatus.js';
import { SUGGESTION_SOURCES } from '../../src/constants/suggestionSource.js';
import { resetAiConfigCache } from '../../src/modules/ai/aiConfig.js';
import {
  resetAiProviderFactory,
  setAiProviderForTests,
} from '../../src/modules/ai/aiProviderFactory.js';
import {
  analyzeTicketById,
  queueTicketAnalysis,
} from '../../src/modules/ai/aiAnalysis.service.js';
import {
  createMockProvider,
  flushAsyncQueue,
  sampleAiAnalysis,
} from '../helpers/aiHelper.js';
import {
  enqueueTicketClassification,
  resetClassificationQueueForTests,
  setClassificationConcurrencyForTests,
} from '../../src/modules/ai/classificationQueue.js';
import { parseAndValidateAiAnalysisOutput } from '../../src/modules/ai/aiOutput.schema.js';

describe('Ticket classification triage', () => {
  let app;

  beforeAll(async () => {
    await setupTestDb();
    const { default: createApp } = await import('../../src/app.js');
    app = createApp();
  }, 60000);

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearDatabase();
    resetClassificationQueueForTests();
    delete process.env.AI_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
    resetAiConfigCache();
    resetAiProviderFactory();
  });

  const configureOpenAiEnv = () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_MODEL = 'gpt-4o-mini';
    resetAiConfigCache();
    resetAiProviderFactory();
  };

  const biographyTicketPayload = {
    subject: 'How can I update my author biography?',
    description:
      'I would like to update the author biography displayed on my book page. Please let me know where I can submit the revised biography and whether any approval is required.',
    bookId: 'BK001',
  };

  it('assigns low priority to author biography updates at creation', async () => {
    configureOpenAiEnv();
    setAiProviderForTests(
      createMockProvider(
        sampleAiAnalysis({
          category: TICKET_CATEGORIES.ISBN_METADATA,
          priority: TICKET_PRIORITIES.MEDIUM,
          priorityRationale: 'Metadata update may need review.',
        }),
      ),
    );

    const author = await createTestAuthor({
      email: 'bio.author@bookleaf.test',
      authorId: 'AUTHB01',
    });
    await createTestBook(author._id, { bookId: 'BK001' });

    const { agent } = await loginDirect(app, {
      email: 'bio.author@bookleaf.test',
      password: samplePassword,
    });

    const response = await agent.post('/api/v1/tickets').send(biographyTicketPayload);

    expect(response.status).toBe(201);
    expect(response.body.data.ticket.priority).toBe(TICKET_PRIORITIES.LOW);

    await flushAsyncQueue();

    const stored = await Ticket.findById(response.body.data.ticket.id);
    expect(stored.policyPriority).toBe(TICKET_PRIORITIES.LOW);
    expect(stored.priority).toBe(TICKET_PRIORITIES.LOW);
    expect(stored.aiPriority).toBe(TICKET_PRIORITIES.MEDIUM);
    expect(stored.aiProcessingStatus).toBe(AI_PROCESSING_STATUSES.COMPLETED);
  });

  it('assigns low priority to author name updates at creation', async () => {
    const author = await createTestAuthor({
      email: 'name.author@bookleaf.test',
      authorId: 'AUTHB02',
    });
    await createTestBook(author._id, { bookId: 'BK001' });

    const { agent } = await loginDirect(app, {
      email: 'name.author@bookleaf.test',
      password: samplePassword,
    });

    const response = await agent.post('/api/v1/tickets').send({
      subject: 'How do I update my author name?',
      description: 'Please let me know the process for changing the name shown on my book page.',
      bookId: 'BK001',
    });

    expect(response.status).toBe(201);
    expect(response.body.data.ticket.priority).toBe(TICKET_PRIORITIES.LOW);

    const stored = await Ticket.findById(response.body.data.ticket.id);
    expect(stored.policyRuleId).toBe('routine-profile-update');
  });

  it('keeps effective priority when AI suggests a different priority', async () => {
    configureOpenAiEnv();
    setAiProviderForTests(createMockProvider(sampleAiAnalysis()));

    const author = await createTestAuthor({
      email: 'split.author@bookleaf.test',
      authorId: 'AUTHB03',
    });
    const ticket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-B100',
      subject: biographyTicketPayload.subject,
      description: biographyTicketPayload.description,
      policyCategory: TICKET_CATEGORIES.GENERAL_INQUIRY,
      policyPriority: TICKET_PRIORITIES.LOW,
      category: TICKET_CATEGORIES.GENERAL_INQUIRY,
      priority: TICKET_PRIORITIES.LOW,
    });

    await analyzeTicketById(ticket._id);

    const stored = await Ticket.findById(ticket._id);
    expect(stored.policyPriority).toBe(TICKET_PRIORITIES.LOW);
    expect(stored.aiPriority).toBe(TICKET_PRIORITIES.HIGH);
    expect(stored.priority).toBe(TICKET_PRIORITIES.LOW);
  });

  it('preserves admin override when AI classification completes later', async () => {
    configureOpenAiEnv();
    setAiProviderForTests(createMockProvider(sampleAiAnalysis()));

    const author = await createTestAuthor({
      email: 'override.ai@bookleaf.test',
      authorId: 'AUTHB04',
    });
    const ticket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-B101',
      policyPriority: TICKET_PRIORITIES.LOW,
      priority: TICKET_PRIORITIES.CRITICAL,
      priorityOverride: true,
    });

    await analyzeTicketById(ticket._id);

    const stored = await Ticket.findById(ticket._id);
    expect(stored.priority).toBe(TICKET_PRIORITIES.CRITICAL);
    expect(stored.priorityOverride).toBe(true);
    expect(stored.aiPriority).toBe(TICKET_PRIORITIES.HIGH);
  });

  it('marks AI failures without changing effective priority', async () => {
    configureOpenAiEnv();
    const failingProvider = createMockProvider(sampleAiAnalysis());
    failingProvider.generateTicketAnalysis.mockRejectedValue(new Error('OpenAI rate limit'));
    setAiProviderForTests(failingProvider);

    const author = await createTestAuthor({
      email: 'fail.ai@bookleaf.test',
      authorId: 'AUTHB05',
    });
    const ticket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-B102',
      policyPriority: TICKET_PRIORITIES.LOW,
      priority: TICKET_PRIORITIES.LOW,
    });

    await expect(analyzeTicketById(ticket._id)).rejects.toThrow('OpenAI rate limit');

    const stored = await Ticket.findById(ticket._id);
    expect(stored.aiProcessingStatus).toBe(AI_PROCESSING_STATUSES.FAILED);
    expect(stored.priority).toBe(TICKET_PRIORITIES.LOW);
    expect(stored.aiError).toContain('OpenAI rate limit');
  });

  it('rejects invalid AI priority values during validation', () => {
    expect(() =>
      parseAndValidateAiAnalysisOutput({
        category: TICKET_CATEGORIES.GENERAL_INQUIRY,
        priority: 'URGENT',
        priorityRationale: 'Invalid priority',
        draftResponse: 'Draft',
        knowledgeBaseReferences: ['communication-tone'],
        needsHumanReview: false,
      }),
    ).toThrow(/priority/i);
  });

  it('deduplicates queued classification jobs for the same ticket', async () => {
    configureOpenAiEnv();
    let resolveAnalysis;
    const delayedProvider = createMockProvider(sampleAiAnalysis());
    delayedProvider.generateTicketAnalysis.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAnalysis = () =>
            resolve({
              provider: 'openai',
              model: 'mock-model',
              data: sampleAiAnalysis(),
              usage: null,
              latencyMs: 1,
            });
        }),
    );
    setAiProviderForTests(delayedProvider);

    const author = await createTestAuthor({
      email: 'dedupe.author@bookleaf.test',
      authorId: 'AUTHB06',
    });
    const ticket = await createTestTicket(author._id, { ticketNumber: 'TKT-B103' });

    expect(queueTicketAnalysis(ticket._id)).toBe(true);
    expect(queueTicketAnalysis(ticket._id)).toBe(false);

    resolveAnalysis();
    await flushAsyncQueue();
    await flushAsyncQueue();

    expect(delayedProvider.generateTicketAnalysis).toHaveBeenCalledTimes(1);
  });

  it('processes queued jobs with bounded concurrency', async () => {
    configureOpenAiEnv();
    setClassificationConcurrencyForTests(2);

    let inFlight = 0;
    let maxInFlight = 0;

    setAiProviderForTests(
      createMockProvider(sampleAiAnalysis(), {
        providerName: 'openai',
        modelName: 'mock-model',
      }),
    );

    const providerModule = await import('../../src/modules/ai/aiProviderFactory.js');
    const provider = providerModule.getAiProvider();
    provider.generateTicketAnalysis.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 20));
      inFlight -= 1;
      return {
        provider: 'openai',
        model: 'mock-model',
        data: sampleAiAnalysis(),
        usage: null,
        latencyMs: 20,
      };
    });

    const author = await createTestAuthor({
      email: 'load.author@bookleaf.test',
      authorId: 'AUTHB07',
    });

    const tickets = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        createTestTicket(author._id, { ticketNumber: `TKT-B20${index}` }),
      ),
    );

    tickets.forEach((ticket) => {
      enqueueTicketClassification(ticket._id.toString(), () =>
        analyzeTicketById(ticket._id, { analysisMode: 'classification' }),
      );
    });

    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(maxInFlight).toBeLessThanOrEqual(2);
    expect(provider.generateTicketAnalysis.mock.calls.length).toBe(6);
  });

  it('creates tickets successfully when AI is disabled', async () => {
    const author = await createTestAuthor({
      email: 'disabled.ai@bookleaf.test',
      authorId: 'AUTHB08',
    });
    await createTestBook(author._id, { bookId: 'BK001' });

    const { agent } = await loginDirect(app, {
      email: 'disabled.ai@bookleaf.test',
      password: samplePassword,
    });

    const response = await agent.post('/api/v1/tickets').send(biographyTicketPayload);

    expect(response.status).toBe(201);
    expect(response.body.data.ticket.priority).toBe(TICKET_PRIORITIES.LOW);

    const stored = await Ticket.findById(response.body.data.ticket.id);
    expect(stored.aiProcessingStatus).toBe(AI_PROCESSING_STATUSES.SKIPPED);
    expect(stored.suggestionSource).toBe(SUGGESTION_SOURCES.POLICY_RULES);
  });

  it('exposes policy and AI suggestions separately in admin ticket detail', async () => {
    configureOpenAiEnv();
    await createTestAdmin({ email: 'admin.triage@bookleaf.test' });
    const author = await createTestAuthor({
      email: 'detail.triage@bookleaf.test',
      authorId: 'AUTHB09',
    });
    const ticket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-B109',
      policyCategory: TICKET_CATEGORIES.GENERAL_INQUIRY,
      policyPriority: TICKET_PRIORITIES.LOW,
      policyPriorityRationale: 'Routine profile update.',
      category: TICKET_CATEGORIES.GENERAL_INQUIRY,
      priority: TICKET_PRIORITIES.LOW,
      aiCategory: TICKET_CATEGORIES.ISBN_METADATA,
      aiPriority: TICKET_PRIORITIES.MEDIUM,
      aiPriorityRationale: 'Metadata workflow may need review.',
      aiProcessingStatus: AI_PROCESSING_STATUSES.COMPLETED,
      suggestionSource: SUGGESTION_SOURCES.OPENAI,
    });

    const { agent } = await loginDirect(app, {
      email: 'admin.triage@bookleaf.test',
      password: samplePassword,
    });

    const response = await agent.get(`/api/v1/admin/tickets/${ticket._id.toString()}`);

    expect(response.status).toBe(200);
    expect(response.body.data.ticket.policyPriority).toBe(TICKET_PRIORITIES.LOW);
    expect(response.body.data.ticket.suggestedPriority).toBe(TICKET_PRIORITIES.MEDIUM);
    expect(response.body.data.ticket.priority).toBe(TICKET_PRIORITIES.LOW);
  });
});
