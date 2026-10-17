import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
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
import {
  resetUploadRootForTests,
  setUploadRootForTests,
} from '../../src/modules/attachments/ticketAttachment.service.js';

const MINIMAL_PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\nxref\n0 0\ntrailer\n<<>>\n%%EOF');
const MINIMAL_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

describe('Ticket attachments API', () => {
  let app;
  let uploadRoot;

  beforeAll(async () => {
    uploadRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bookleaf-attachments-'));
    setUploadRootForTests(uploadRoot);
    await setupTestDb();
    const { default: createApp } = await import('../../src/app.js');
    app = createApp();
  }, 60000);

  afterAll(async () => {
    resetUploadRootForTests();
    await teardownTestDb();
    await fs.rm(uploadRoot, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await clearDatabase();
    await fs.rm(uploadRoot, { recursive: true, force: true });
    await fs.mkdir(uploadRoot, { recursive: true });
  });

  const seedAuthorWithBook = async () => {
    const author = await createTestAuthor({
      email: 'attach.author@bookleaf.test',
      authorId: 'AUTH050',
      name: 'Attachment Author',
    });
    await createTestBook(author._id, { bookId: 'BK001' });
    const { agent } = await loginDirect(app, {
      email: 'attach.author@bookleaf.test',
      password: samplePassword,
    });
    return { author, agent };
  };

  it('creates a ticket without an attachment', async () => {
    const { agent } = await seedAuthorWithBook();

    const response = await agent.post('/api/v1/tickets').send({
      subject: 'No attachment',
      description: 'Ticket without a file.',
      bookId: 'BK001',
    });

    expect(response.status).toBe(201);
    expect(response.body.data.ticket.attachment).toBeNull();

    const stored = await Ticket.findOne({ ticketNumber: response.body.data.ticket.ticketNumber });
    expect(stored.attachment).toBeNull();
  });

  it('creates a ticket with a valid attachment and persists metadata', async () => {
    const { agent } = await seedAuthorWithBook();
    const pdfPath = path.join(uploadRoot, 'evidence.pdf');
    await fs.writeFile(pdfPath, MINIMAL_PDF);

    const response = await agent
      .post('/api/v1/tickets')
      .field('subject', 'Royalty evidence')
      .field('description', 'Please review the attached statement.')
      .field('bookId', 'BK001')
      .attach('attachment', pdfPath);

    expect(response.status).toBe(201);
    expect(response.body.data.ticket.attachment).toMatchObject({
      originalFilename: 'evidence.pdf',
      mimeType: 'application/pdf',
      sizeBytes: MINIMAL_PDF.length,
    });
    expect(response.body.data.ticket.attachment.uploadedAt).toBeTruthy();
    expect(JSON.stringify(response.body.data.ticket.attachment)).not.toMatch(/storageKey/);

    const stored = await Ticket.findOne({ ticketNumber: response.body.data.ticket.ticketNumber });
    expect(stored.attachment.originalFilename).toBe('evidence.pdf');
    expect(stored.attachment.storageKey).toMatch(/\.pdf$/i);

    const storedFilePath = path.join(uploadRoot, stored.attachment.storageKey);
    await expect(fs.access(storedFilePath)).resolves.toBeUndefined();
  });

  it('rejects unsupported file types', async () => {
    const { agent } = await seedAuthorWithBook();
    const badPath = path.join(uploadRoot, 'malware.exe');
    await fs.writeFile(badPath, Buffer.from('MZ'));

    const response = await agent
      .post('/api/v1/tickets')
      .field('subject', 'Bad file')
      .field('description', 'Should fail')
      .field('categoryContext', 'GENERAL_ACCOUNT')
      .attach('attachment', badPath);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(await Ticket.countDocuments()).toBe(0);
  });

  it('rejects oversized attachments', async () => {
    const { agent } = await seedAuthorWithBook();
    const bigPath = path.join(uploadRoot, 'big.pdf');
    await fs.writeFile(bigPath, Buffer.concat([MINIMAL_PDF, Buffer.alloc(5 * 1024 * 1024)]));

    const response = await agent
      .post('/api/v1/tickets')
      .field('subject', 'Too big')
      .field('description', 'Should fail on size')
      .field('categoryContext', 'GENERAL_ACCOUNT')
      .attach('attachment', bigPath);

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/maximum allowed size/i);
    expect(await Ticket.countDocuments()).toBe(0);
  });

  it('allows an author to download their own ticket attachment', async () => {
    const { author, agent } = await seedAuthorWithBook();
    const pdfPath = path.join(uploadRoot, 'download-me.pdf');
    await fs.writeFile(pdfPath, MINIMAL_PDF);

    const created = await agent
      .post('/api/v1/tickets')
      .field('subject', 'Download test')
      .field('description', 'Attachment download')
      .field('categoryContext', 'GENERAL_ACCOUNT')
      .attach('attachment', pdfPath);

    const ticketId = created.body.data.ticket.id;
    const download = await agent.get(`/api/v1/tickets/${ticketId}/attachment`);

    expect(download.status).toBe(200);
    expect(download.headers['content-type']).toBe('application/pdf');
    expect(download.body.toString()).toContain('%PDF');
  });

  it('prevents one author from downloading another author attachment', async () => {
    const owner = await createTestAuthor({
      email: 'owner.attach@bookleaf.test',
      authorId: 'AUTH051',
    });
    const other = await createTestAuthor({
      email: 'other.attach@bookleaf.test',
      authorId: 'AUTH052',
    });
    const ticket = await createTestTicket(owner._id, {
      ticketNumber: 'TKT-9100',
      attachment: {
        originalFilename: 'secret.pdf',
        storageKey: '00000000-0000-4000-8000-000000000001.pdf',
        mimeType: 'application/pdf',
        sizeBytes: MINIMAL_PDF.length,
        uploadedAt: new Date(),
        storageProvider: 'local',
      },
    });
    await fs.writeFile(
      path.join(uploadRoot, '00000000-0000-4000-8000-000000000001.pdf'),
      MINIMAL_PDF,
    );

    const { agent } = await loginDirect(app, {
      email: 'other.attach@bookleaf.test',
      password: samplePassword,
    });

    const response = await agent.get(`/api/v1/tickets/${ticket._id.toString()}/attachment`);
    expect(response.status).toBe(404);
    expect(other._id.toString()).not.toBe(owner._id.toString());
  });

  it('allows admins to download ticket attachments', async () => {
    const author = await createTestAuthor({
      email: 'admin-download.author@bookleaf.test',
      authorId: 'AUTH053',
    });
    await createTestAdmin({ email: 'admin.attach@bookleaf.test' });
    const ticket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-9101',
      attachment: {
        originalFilename: 'admin-view.pdf',
        storageKey: '00000000-0000-4000-8000-000000000002.pdf',
        mimeType: 'application/pdf',
        sizeBytes: MINIMAL_PDF.length,
        uploadedAt: new Date(),
        storageProvider: 'local',
      },
    });
    await fs.writeFile(
      path.join(uploadRoot, '00000000-0000-4000-8000-000000000002.pdf'),
      MINIMAL_PDF,
    );

    const { agent } = await loginDirect(app, {
      email: 'admin.attach@bookleaf.test',
      password: samplePassword,
    });

    const response = await agent.get(`/api/v1/admin/tickets/${ticket._id.toString()}/attachment`);
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
  });

  it('cleans up when attachment storage fails and does not create a ticket', async () => {
    const { agent } = await seedAuthorWithBook();
    const sourcePdfPath = path.join(os.tmpdir(), `storage-fail-${Date.now()}.pdf`);
    await fs.writeFile(sourcePdfPath, MINIMAL_PDF);
    await fs.mkdir(path.join(uploadRoot, 'tmp'), { recursive: true });
    await fs.chmod(uploadRoot, 0o555);

    try {
      const response = await agent
        .post('/api/v1/tickets')
        .field('subject', 'Storage failure')
        .field('description', 'Should roll back cleanly.')
        .field('categoryContext', 'GENERAL_ACCOUNT')
        .attach('attachment', sourcePdfPath);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/unable to store ticket attachment/i);
      expect(await Ticket.countDocuments()).toBe(0);

      const rootEntries = await fs.readdir(uploadRoot);
      expect(rootEntries.filter((name) => name.endsWith('.pdf'))).toEqual([]);
    } finally {
      await fs.chmod(uploadRoot, 0o755);
      await fs.rm(sourcePdfPath, { force: true });
    }
  });

  it('rejects unauthenticated attachment downloads', async () => {
    const author = await createTestAuthor({
      email: 'unauth.attach@bookleaf.test',
      authorId: 'AUTH054',
    });
    const ticket = await createTestTicket(author._id, { ticketNumber: 'TKT-9102' });

    const response = await request(app).get(`/api/v1/tickets/${ticket._id.toString()}/attachment`);
    expect(response.status).toBe(401);
  });
});
