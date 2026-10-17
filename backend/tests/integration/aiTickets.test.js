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
import AuditLog from '../../src/modules/audit-logs/auditLog.model.js';
import { TICKET_CATEGORIES } from '../../src/constants/ticketCategory.js';
import { TICKET_PRIORITIES } from '../../src/constants/ticketPriority.js';
import { AI_PROCESSING_STATUSES } from '../../src/constants/aiProcessingStatus.js';
import { AUDIT_ACTIONS } from '../../src/constants/auditActions.js';
import { resetAiConfigCache } from '../../src/modules/ai/aiConfig.js';
import {
  resetAiProviderFactory,
  setAiProviderForTests,
} from '../../src/modules/ai/aiProviderFactory.js';
import {
  analyzeTicketById,
  ensureAdminTicketAiDraft,
  queueTicketAnalysis,
} from '../../src/modules/ai/aiAnalysis.service.js';
import { SUGGESTION_SOURCES } from '../../src/constants/suggestionSource.js';
import TicketMessage from '../../src/modules/tickets/ticketMessage.model.js';
import InternalNote from '../../src/modules/tickets/internalNote.model.js';
import { ROLES } from '../../src/constants/roles.js';
import {
  createMockProvider,
  flushAsyncQueue,
  sampleAiAnalysis,
} from '../helpers/aiHelper.js';

describe('AI ticket processing', () => {
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
    delete process.env.AI_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_MODEL;
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

  it('persists provider and model metadata after successful analysis', async () => {
    configureOpenAiEnv();
    setAiProviderForTests(
      createMockProvider(sampleAiAnalysis(), {
        providerName: 'openai',
        modelName: 'gpt-4o-mini',
      }),
    );

    const author = await createTestAuthor({
      email: 'ai.author@bookleaf.test',
      authorId: 'AUTH001',
    });
    const ticket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-9101',
      subject: 'Royalty payout delay',
      description: 'My royalty payout is still pending.',
    });

    await analyzeTicketById(ticket._id);

    const refreshed = await Ticket.findById(ticket._id);
    expect(refreshed.aiProcessingStatus).toBe(AI_PROCESSING_STATUSES.COMPLETED);
    expect(refreshed.aiProvider).toBe('openai');
    expect(refreshed.aiModel).toBe('gpt-4o-mini');
    expect(refreshed.aiCategory).toBe(TICKET_CATEGORIES.ROYALTY_PAYMENTS);
    expect(refreshed.aiPriority).toBe(TICKET_PRIORITIES.HIGH);

    const auditEntry = await AuditLog.findOne({
      action: AUDIT_ACTIONS.AI_CLASSIFICATION_COMPLETED,
    });
    expect(auditEntry.metadata.provider).toBe('openai');
    expect(auditEntry.metadata.model).toBe('gpt-4o-mini');
  });

  it('preserves admin category and priority overrides during analysis', async () => {
    configureOpenAiEnv();
    setAiProviderForTests(createMockProvider(sampleAiAnalysis()));

    const author = await createTestAuthor({
      email: 'override.author@bookleaf.test',
      authorId: 'AUTH002',
    });
    const ticket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-9102',
      category: TICKET_CATEGORIES.GENERAL_INQUIRY,
      priority: TICKET_PRIORITIES.LOW,
      priorityOverride: true,
    });

    await analyzeTicketById(ticket._id);

    const refreshed = await Ticket.findById(ticket._id);
    expect(refreshed.category).toBe(TICKET_CATEGORIES.GENERAL_INQUIRY);
    expect(refreshed.priority).toBe(TICKET_PRIORITIES.LOW);
    expect(refreshed.aiCategory).toBe(TICKET_CATEGORIES.ROYALTY_PAYMENTS);
    expect(refreshed.aiPriority).toBe(TICKET_PRIORITIES.HIGH);
  });

  it('marks tickets failed without cross-provider fallback', async () => {
    configureOpenAiEnv();
    const failingProvider = createMockProvider(sampleAiAnalysis());
    failingProvider.generateTicketAnalysis.mockRejectedValue(new Error('OpenAI unavailable'));
    setAiProviderForTests(failingProvider);

    const author = await createTestAuthor({
      email: 'fail.author@bookleaf.test',
      authorId: 'AUTH003',
    });
    const ticket = await createTestTicket(author._id, { ticketNumber: 'TKT-9103' });

    await expect(analyzeTicketById(ticket._id)).rejects.toThrow('OpenAI unavailable');

    const refreshed = await Ticket.findById(ticket._id);
    expect(refreshed.aiProcessingStatus).toBe(AI_PROCESSING_STATUSES.FAILED);
    expect(refreshed.aiError).toBe('OpenAI unavailable');
    expect(failingProvider.generateTicketAnalysis).toHaveBeenCalledTimes(1);
  });

  it('allows ticket creation and admin replies when AI is disabled', async () => {
    await createTestAdmin({ email: 'admin.ai@bookleaf.test' });
    const author = await createTestAuthor({
      email: 'manual.author@bookleaf.test',
      authorId: 'AUTH004',
    });
    await createTestBook(author._id, { bookId: 'BK001' });

    const { agent: authorAgent } = await loginDirect(app, {
      email: 'manual.author@bookleaf.test',
      password: samplePassword,
    });

    const createResponse = await authorAgent.post('/api/v1/tickets').send({
      subject: 'Manual workflow ticket',
      description: 'This ticket should succeed without AI configured.',
      bookId: 'BK001',
    });

    expect(createResponse.status).toBe(201);

    const ticketId = createResponse.body.data.ticket.id;
    await flushAsyncQueue();
    const storedTicket = await Ticket.findById(ticketId);
    expect(storedTicket.aiProcessingStatus).toBe(AI_PROCESSING_STATUSES.SKIPPED);

    const { agent: adminAgent } = await loginDirect(app, {
      email: 'admin.ai@bookleaf.test',
      password: samplePassword,
    });

    const replyResponse = await adminAgent
      .post(`/api/v1/admin/tickets/${ticketId}/messages`)
      .send({ body: 'We are handling this manually.' });

    expect(replyResponse.status).toBe(201);

    const detailResponse = await adminAgent.get(`/api/v1/admin/tickets/${ticketId}`);
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.ticket.aiConfigured).toBe(false);
  });

  it('returns admin ticket detail with AI metadata', async () => {
    configureOpenAiEnv();
    await createTestAdmin({ email: 'admin.detail@bookleaf.test' });
    const author = await createTestAuthor({
      email: 'detail.author@bookleaf.test',
      authorId: 'AUTH005',
    });
    const ticket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-9104',
      aiProcessingStatus: AI_PROCESSING_STATUSES.COMPLETED,
      aiCategory: TICKET_CATEGORIES.ROYALTY_PAYMENTS,
      aiPriority: TICKET_PRIORITIES.HIGH,
      aiDraftResponse: 'Draft reply text',
      aiProvider: 'openai',
      aiModel: 'gpt-4o-mini',
      aiNeedsHumanReview: true,
      aiKnowledgeBaseReferences: ['royalty-payout'],
    });

    const { agent } = await loginDirect(app, {
      email: 'admin.detail@bookleaf.test',
      password: samplePassword,
    });

    const response = await agent.get(`/api/v1/admin/tickets/${ticket._id}`);

    expect(response.status).toBe(200);
    expect(response.body.data.ticket.aiProvider).toBe('openai');
    expect(response.body.data.ticket.aiModel).toBe('gpt-4o-mini');
    expect(response.body.data.ticket.aiDraftResponse).toBe('Draft reply text');
    expect(response.body.data.ticket.aiKnowledgeBaseReferences).toEqual(['royalty-payout']);
    expect(response.body.data.ticket.aiConfigured).toBe(true);
  });

  it('regenerates AI drafts through the admin endpoint', async () => {
    configureOpenAiEnv();
    setAiProviderForTests(
      createMockProvider(
        sampleAiAnalysis({ draftResponse: 'Regenerated draft response' }),
        { providerName: 'ollama', modelName: 'llama3.2' },
      ),
    );

    await createTestAdmin({ email: 'admin.draft@bookleaf.test' });
    const author = await createTestAuthor({
      email: 'draft.author@bookleaf.test',
      authorId: 'AUTH006',
    });
    const ticket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-9105',
      category: TICKET_CATEGORIES.GENERAL_INQUIRY,
      priority: TICKET_PRIORITIES.MEDIUM,
    });

    const { agent } = await loginDirect(app, {
      email: 'admin.draft@bookleaf.test',
      password: samplePassword,
    });

    const response = await agent.post(`/api/v1/admin/tickets/${ticket._id}/ai/draft`);

    expect(response.status).toBe(200);
    expect(response.body.data.ticket.aiDraftResponse).toBe('Regenerated draft response');
    expect(response.body.data.ticket.aiProvider).toBe('ollama');
    expect(response.body.data.ticket.suggestionSource).toBe(SUGGESTION_SOURCES.OLLAMA);
    expect(response.body.data.ticket.category).toBe(TICKET_CATEGORIES.GENERAL_INQUIRY);

    const auditEntry = await AuditLog.findOne({ action: AUDIT_ACTIONS.AI_DRAFT_GENERATED });
    expect(auditEntry).toBeTruthy();
  });

  it('queues background classification after ticket creation without blocking the response', async () => {
    configureOpenAiEnv();
    const mockProvider = createMockProvider(
      sampleAiAnalysis({ draftResponse: 'Background draft reply' }),
    );
    setAiProviderForTests(mockProvider);

    await createTestAdmin({ email: 'queue.admin@bookleaf.test' });
    const author = await createTestAuthor({
      email: 'queue.author@bookleaf.test',
      authorId: 'AUTH010',
    });
    await createTestBook(author._id, { bookId: 'BK001' });

    const { agent } = await loginDirect(app, {
      email: 'queue.author@bookleaf.test',
      password: samplePassword,
    });

    const createResponse = await agent.post('/api/v1/tickets').send({
      subject: 'Royalty payout delay',
      description: 'My royalty payout is still pending after the expected date.',
      bookId: 'BK001',
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.ticket.category).toBeTruthy();
    expect(createResponse.body.data.ticket.priority).toBeTruthy();
    expect(createResponse.body.data.ticket.aiProcessingStatus).toBeUndefined();

    await flushAsyncQueue();

    const storedTicket = await Ticket.findById(createResponse.body.data.ticket.id);
    expect(storedTicket.aiProcessingStatus).toBe(AI_PROCESSING_STATUSES.COMPLETED);
    expect(storedTicket.aiCategory).toBe(TICKET_CATEGORIES.ROYALTY_PAYMENTS);
    expect(storedTicket.aiDraftResponse).toBeNull();
    expect(storedTicket.suggestionSource).toBe(SUGGESTION_SOURCES.OPENAI);
    expect(mockProvider.generateTicketAnalysis).toHaveBeenCalledTimes(1);
  });

  it('generates and persists a draft when an admin opens a ticket without a valid draft', async () => {
    configureOpenAiEnv();
    const mockProvider = createMockProvider(
      sampleAiAnalysis({ draftResponse: 'Draft generated on admin open' }),
    );
    setAiProviderForTests(mockProvider);

    await createTestAdmin({ email: 'open.admin@bookleaf.test' });
    const author = await createTestAuthor({
      email: 'open.author@bookleaf.test',
      authorId: 'AUTH018',
    });
    const ticket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-9118',
      aiProcessingStatus: AI_PROCESSING_STATUSES.COMPLETED,
      aiCategory: TICKET_CATEGORIES.ROYALTY_PAYMENTS,
      aiPriority: TICKET_PRIORITIES.HIGH,
      suggestionSource: SUGGESTION_SOURCES.OPENAI,
      lastMessageAt: new Date('2024-05-01T00:00:00.000Z'),
    });

    const { agent } = await loginDirect(app, {
      email: 'open.admin@bookleaf.test',
      password: samplePassword,
    });

    const response = await agent.get(`/api/v1/admin/tickets/${ticket._id.toString()}`);

    expect(response.status).toBe(200);
    expect(response.body.data.ticket.aiDraftResponse).toBe('Draft generated on admin open');
    expect(mockProvider.generateTicketAnalysis).toHaveBeenCalledTimes(1);

    const storedTicket = await Ticket.findById(ticket._id);
    expect(storedTicket.aiDraftContextLastMessageAt.toISOString()).toBe(
      '2024-05-01T00:00:00.000Z',
    );
  });

  it('reuses a saved draft for the current conversation version without another provider call', async () => {
    configureOpenAiEnv();
    const mockProvider = createMockProvider(
      sampleAiAnalysis({ draftResponse: 'Saved draft for reuse' }),
    );
    setAiProviderForTests(mockProvider);

    await createTestAdmin({ email: 'reuse.admin@bookleaf.test' });
    const author = await createTestAuthor({
      email: 'reuse.author@bookleaf.test',
      authorId: 'AUTH019',
    });
    const lastMessageAt = new Date('2024-05-02T00:00:00.000Z');
    const ticket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-9119',
      aiProcessingStatus: AI_PROCESSING_STATUSES.COMPLETED,
      aiDraftResponse: 'Saved draft for reuse',
      aiDraftContextLastMessageAt: lastMessageAt,
      lastMessageAt,
    });

    const { agent } = await loginDirect(app, {
      email: 'reuse.admin@bookleaf.test',
      password: samplePassword,
    });

    const response = await agent.get(`/api/v1/admin/tickets/${ticket._id.toString()}`);

    expect(response.status).toBe(200);
    expect(response.body.data.ticket.aiDraftResponse).toBe('Saved draft for reuse');
    expect(mockProvider.generateTicketAnalysis).not.toHaveBeenCalled();
  });

  it('regenerates a draft after public conversation activity invalidates the saved draft', async () => {
    configureOpenAiEnv();
    const mockProvider = createMockProvider(
      sampleAiAnalysis({ draftResponse: 'Fresh draft after follow-up' }),
    );
    setAiProviderForTests(mockProvider);

    await createTestAdmin({ email: 'staleopen.admin@bookleaf.test' });
    const author = await createTestAuthor({
      email: 'staleopen.author@bookleaf.test',
      authorId: 'AUTH020',
    });
    const ticket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-9120',
      aiProcessingStatus: AI_PROCESSING_STATUSES.COMPLETED,
      aiDraftResponse: 'Old draft',
      aiDraftContextLastMessageAt: new Date('2024-05-01T00:00:00.000Z'),
      lastMessageAt: new Date('2024-06-01T00:00:00.000Z'),
      aiNeedsHumanReview: true,
    });

    const { agent } = await loginDirect(app, {
      email: 'staleopen.admin@bookleaf.test',
      password: samplePassword,
    });

    const response = await agent.get(`/api/v1/admin/tickets/${ticket._id.toString()}`);

    expect(response.status).toBe(200);
    expect(response.body.data.ticket.aiDraftResponse).toBe('Fresh draft after follow-up');
    expect(mockProvider.generateTicketAnalysis).toHaveBeenCalledTimes(1);
  });

  it('preserves manual admin workflow when draft generation fails on ticket open', async () => {
    configureOpenAiEnv();
    const failingProvider = createMockProvider(sampleAiAnalysis());
    failingProvider.generateTicketAnalysis.mockRejectedValue(new Error('OpenAI unavailable'));
    setAiProviderForTests(failingProvider);

    await createTestAdmin({ email: 'failopen.admin@bookleaf.test' });
    const author = await createTestAuthor({
      email: 'failopen.author@bookleaf.test',
      authorId: 'AUTH021',
    });
    const ticket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-9121',
      aiProcessingStatus: AI_PROCESSING_STATUSES.COMPLETED,
    });

    const { agent } = await loginDirect(app, {
      email: 'failopen.admin@bookleaf.test',
      password: samplePassword,
    });

    const response = await agent.get(`/api/v1/admin/tickets/${ticket._id.toString()}`);

    expect(response.status).toBe(200);
    expect(response.body.data.ticket.aiDraftResponse).toBeNull();
    expect(response.body.data.ticket.aiProcessingStatus).toBe(AI_PROCESSING_STATUSES.FAILED);
  });

  it('does not start duplicate draft jobs when ensureAdminTicketAiDraft runs concurrently', async () => {
    configureOpenAiEnv();
    let releaseProviderCall;
    const mockProvider = createMockProvider(
      sampleAiAnalysis({ draftResponse: 'Single draft generation' }),
    );
    mockProvider.generateTicketAnalysis.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseProviderCall = () =>
            resolve({
              provider: 'openai',
              model: 'gpt-4o-mini',
              data: sampleAiAnalysis({ draftResponse: 'Single draft generation' }),
            });
        }),
    );
    setAiProviderForTests(mockProvider);

    const admin = await createTestAdmin({ email: 'dup.admin@bookleaf.test' });
    const author = await createTestAuthor({
      email: 'dup.author@bookleaf.test',
      authorId: 'AUTH022',
    });
    const ticket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-9122',
      aiProcessingStatus: AI_PROCESSING_STATUSES.COMPLETED,
    });

    const firstEnsure = ensureAdminTicketAiDraft(admin._id, ticket._id);
    const secondEnsure = ensureAdminTicketAiDraft(admin._id, ticket._id);

    for (let attempt = 0; attempt < 20 && !releaseProviderCall; attempt += 1) {
      await new Promise((resolve) => setImmediate(resolve));
    }

    expect(releaseProviderCall).toEqual(expect.any(Function));
    releaseProviderCall();

    await Promise.all([firstEnsure, secondEnsure]);

    expect(mockProvider.generateTicketAnalysis).toHaveBeenCalledTimes(1);
  });

  it('preserves deterministic policy priority immediately and after AI failure', async () => {
    configureOpenAiEnv();
    const failingProvider = createMockProvider(sampleAiAnalysis());
    failingProvider.generateTicketAnalysis.mockRejectedValue(new Error('OpenAI unavailable'));
    setAiProviderForTests(failingProvider);

    const author = await createTestAuthor({
      email: 'policy.fail@bookleaf.test',
      authorId: 'AUTH011',
    });
    await createTestBook(author._id, { bookId: 'BK001' });

    const { agent } = await loginDirect(app, {
      email: 'policy.fail@bookleaf.test',
      password: samplePassword,
    });

    const createResponse = await agent.post('/api/v1/tickets').send({
      subject: 'Royalty payout delay',
      description: 'My royalty payout is still pending after the expected date.',
      bookId: 'BK001',
    });

    expect(createResponse.status).toBe(201);
    const immediatePriority = createResponse.body.data.ticket.priority;

    await flushAsyncQueue();

    const storedTicket = await Ticket.findById(createResponse.body.data.ticket.id);
    expect(storedTicket.priority).toBe(immediatePriority);
    expect(storedTicket.suggestionSource).toBe(SUGGESTION_SOURCES.POLICY_RULES);
    expect(storedTicket.aiProcessingStatus).toBe(AI_PROCESSING_STATUSES.FAILED);
    expect(storedTicket.aiError).toBe('OpenAI unavailable');
  });

  it('does not overwrite effective priority when manually overridden during background analysis', async () => {
    configureOpenAiEnv();
    setAiProviderForTests(createMockProvider(sampleAiAnalysis()));

    const author = await createTestAuthor({
      email: 'override.queue@bookleaf.test',
      authorId: 'AUTH012',
    });
    const ticket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-9112',
      category: TICKET_CATEGORIES.GENERAL_INQUIRY,
      priority: TICKET_PRIORITIES.LOW,
      priorityOverride: true,
      aiProcessingStatus: AI_PROCESSING_STATUSES.SKIPPED,
      suggestionSource: SUGGESTION_SOURCES.POLICY_RULES,
    });

    await analyzeTicketById(ticket._id);

    const refreshed = await Ticket.findById(ticket._id);
    expect(refreshed.priority).toBe(TICKET_PRIORITIES.LOW);
    expect(refreshed.aiPriority).toBe(TICKET_PRIORITIES.HIGH);
    expect(refreshed.aiProcessingStatus).toBe(AI_PROCESSING_STATUSES.COMPLETED);
  });

  it('rejects stale background writes when lastMessageAt no longer matches the analysis snapshot', async () => {
    configureOpenAiEnv();
    setAiProviderForTests(createMockProvider(sampleAiAnalysis()));

    const author = await createTestAuthor({
      email: 'stale.ai@bookleaf.test',
      authorId: 'AUTH013',
    });
    const ticket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-9113',
      aiProcessingStatus: AI_PROCESSING_STATUSES.SKIPPED,
      suggestionSource: SUGGESTION_SOURCES.POLICY_RULES,
      aiDraftResponse: 'Existing draft',
      lastMessageAt: new Date('2024-01-01T00:00:00.000Z'),
    });

    await analyzeTicketById(ticket._id);

    await TicketMessage.create({
      ticket: ticket._id,
      sender: author._id,
      senderRole: ROLES.AUTHOR,
      body: 'Newer public follow-up',
    });
    await Ticket.updateOne(
      { _id: ticket._id },
      { $set: { lastMessageAt: new Date('2024-02-01T00:00:00.000Z') } },
    );

    const staleWrite = await Ticket.updateOne(
      {
        _id: ticket._id,
        lastMessageAt: new Date('2024-01-01T00:00:00.000Z'),
      },
      { $set: { aiDraftResponse: 'Stale draft should not persist' } },
    );

    expect(staleWrite.matchedCount).toBe(0);

    const refreshed = await Ticket.findById(ticket._id);
    expect(refreshed.aiDraftResponse).not.toBe('Stale draft should not persist');
    expect(refreshed.lastMessageAt.toISOString()).toBe('2024-02-01T00:00:00.000Z');
  });

  it('skips overlapping background jobs while analysis is in progress', async () => {
    configureOpenAiEnv();
    const mockProvider = createMockProvider(sampleAiAnalysis());
    setAiProviderForTests(mockProvider);

    const author = await createTestAuthor({
      email: 'overlap.ai@bookleaf.test',
      authorId: 'AUTH014',
    });
    const ticket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-9114',
      aiProcessingStatus: AI_PROCESSING_STATUSES.SKIPPED,
      suggestionSource: SUGGESTION_SOURCES.POLICY_RULES,
    });

    await Ticket.updateOne(
      { _id: ticket._id },
      { $set: { aiProcessingStatus: AI_PROCESSING_STATUSES.IN_PROGRESS } },
    );

    queueTicketAnalysis(ticket._id);
    await flushAsyncQueue();

    expect(mockProvider.generateTicketAnalysis).not.toHaveBeenCalled();
  });

  it('passes retrieved knowledge base context and public conversation only to the provider', async () => {
    configureOpenAiEnv();
    const mockProvider = createMockProvider(sampleAiAnalysis());
    setAiProviderForTests(mockProvider);

    const admin = await createTestAdmin({ email: 'kb.admin@bookleaf.test' });
    const author = await createTestAuthor({
      email: 'kb.author@bookleaf.test',
      authorId: 'AUTH015',
    });
    const ticket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-9115',
      subject: 'Royalty payout delay',
      description: 'My royalty payout is still pending.',
      aiProcessingStatus: AI_PROCESSING_STATUSES.SKIPPED,
    });

    await TicketMessage.create({
      ticket: ticket._id,
      sender: author._id,
      senderRole: ROLES.AUTHOR,
      body: 'Public author follow-up',
    });
    await InternalNote.create({
      ticket: ticket._id,
      admin: admin._id,
      body: 'Secret internal note must not reach AI',
    });

    await analyzeTicketById(ticket._id);

    expect(mockProvider.generateTicketAnalysis).toHaveBeenCalledTimes(1);
    const call = mockProvider.generateTicketAnalysis.mock.calls[0][0];
    expect(call.knowledgeBase.length).toBeGreaterThan(0);
    expect(call.conversation.some((message) => message.body.includes('Public author follow-up'))).toBe(
      true,
    );
    expect(
      call.conversation.some((message) => message.body.includes('Secret internal note must not reach AI')),
    ).toBe(false);
  });

  it('records ollama as the suggestion source for admin draft regeneration', async () => {
    configureOpenAiEnv();
    process.env.AI_PROVIDER = 'ollama';
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434';
    process.env.OLLAMA_MODEL = 'llama3.2';
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
    resetAiConfigCache();
    resetAiProviderFactory();

    setAiProviderForTests(
      createMockProvider(sampleAiAnalysis({ draftResponse: 'Ollama draft' }), {
        providerName: 'ollama',
        modelName: 'llama3.2',
      }),
    );

    await createTestAdmin({ email: 'ollama.admin@bookleaf.test' });
    const author = await createTestAuthor({
      email: 'ollama.author@bookleaf.test',
      authorId: 'AUTH016',
    });
    const ticket = await createTestTicket(author._id, { ticketNumber: 'TKT-9116' });

    const { agent } = await loginDirect(app, {
      email: 'ollama.admin@bookleaf.test',
      password: samplePassword,
    });

    const response = await agent.post(`/api/v1/admin/tickets/${ticket._id}/ai/draft`);

    expect(response.status).toBe(200);
    expect(response.body.data.ticket.suggestionSource).toBe(SUGGESTION_SOURCES.OLLAMA);
    expect(response.body.data.ticket.aiProvider).toBe('ollama');
  });

  it('does not expose AI fields in author ticket detail responses', async () => {
    configureOpenAiEnv();
    setAiProviderForTests(createMockProvider(sampleAiAnalysis()));

    const author = await createTestAuthor({
      email: 'hidden.ai@bookleaf.test',
      authorId: 'AUTH017',
    });
    await createTestBook(author._id, { bookId: 'BK001' });

    const { agent } = await loginDirect(app, {
      email: 'hidden.ai@bookleaf.test',
      password: samplePassword,
    });

    const createResponse = await agent.post('/api/v1/tickets').send({
      subject: 'Royalty payout delay',
      description: 'My royalty payout is still pending.',
      bookId: 'BK001',
    });

    await flushAsyncQueue();

    const detailResponse = await agent.get(
      `/api/v1/tickets/${createResponse.body.data.ticket.id}`,
    );

    expect(detailResponse.status).toBe(200);
    expect(JSON.stringify(detailResponse.body)).not.toContain('aiDraftResponse');
    expect(JSON.stringify(detailResponse.body)).not.toContain('aiProcessingStatus');
    expect(JSON.stringify(detailResponse.body)).not.toContain('suggestionSource');
  });

  it('returns 503 when AI draft regeneration is requested without configuration', async () => {
    await createTestAdmin({ email: 'admin.noai@bookleaf.test' });
    const author = await createTestAuthor({
      email: 'noai.author@bookleaf.test',
      authorId: 'AUTH007',
    });
    const ticket = await createTestTicket(author._id, { ticketNumber: 'TKT-9106' });

    const { agent } = await loginDirect(app, {
      email: 'admin.noai@bookleaf.test',
      password: samplePassword,
    });

    const response = await agent.post(`/api/v1/admin/tickets/${ticket._id}/ai/draft`);

    expect(response.status).toBe(503);
  });
});
