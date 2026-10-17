import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import User from '../../../src/modules/users/user.model.js';
import { ROLES } from '../../../src/constants/roles.js';
import { setupTestDb, teardownTestDb } from '../../setup/testDb.js';
import { clearDatabase, samplePasswordHash } from '../../helpers/modelTestHelper.js';

describe('User model', () => {
  beforeAll(async () => {
    await setupTestDb();
  }, 60000);

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('creates a valid author document', async () => {
    const author = await User.create({
      email: 'Priya.Sharma@email.com',
      passwordHash: samplePasswordHash,
      role: ROLES.AUTHOR,
      authorId: 'AUTH001',
      name: 'Priya Sharma',
      phone: '+91-98765-43210',
      city: 'Mumbai',
      joinedDate: new Date('2023-03-15'),
    });

    expect(author._id).toBeDefined();
    expect(author.email).toBe('priya.sharma@email.com');
    expect(author.role).toBe(ROLES.AUTHOR);
    expect(author.authorId).toBe('AUTH001');

    const persistedAuthor = await User.findById(author._id);
    expect(persistedAuthor.passwordHash).toBeUndefined();
  });

  it('creates a valid administrator document without an author source identifier', async () => {
    const admin = await User.create({
      email: 'admin@bookleaf.test',
      passwordHash: samplePasswordHash,
      role: ROLES.ADMIN,
      name: 'Support Admin',
    });

    expect(admin.role).toBe(ROLES.ADMIN);
    expect(admin.authorId).toBeUndefined();
  });

  it('allows multiple administrators without author source identifiers', async () => {
    await User.create({
      email: 'admin1@bookleaf.test',
      passwordHash: samplePasswordHash,
      role: ROLES.ADMIN,
    });

    await expect(
      User.create({
        email: 'admin2@bookleaf.test',
        passwordHash: samplePasswordHash,
        role: ROLES.ADMIN,
      }),
    ).resolves.toBeDefined();
  });

  it('rejects an invalid role', async () => {
    const user = new User({
      email: 'invalid-role@bookleaf.test',
      passwordHash: samplePasswordHash,
      role: 'SUPERUSER',
      authorId: 'AUTH999',
    });

    await expect(user.validate()).rejects.toThrow(/not a valid role/);
  });

  it('rejects missing required fields', async () => {
    const user = new User({ role: ROLES.AUTHOR });

    await expect(user.validate()).rejects.toThrow(/Email is required/);
  });

  it('requires author source identifier for author accounts', async () => {
    const user = new User({
      email: 'author-missing-id@bookleaf.test',
      passwordHash: samplePasswordHash,
      role: ROLES.AUTHOR,
      name: 'Missing Author Id',
    });

    await expect(user.validate()).rejects.toThrow(/Author source identifier is required/);
  });

  it('rejects author source identifier on administrator accounts', async () => {
    const user = new User({
      email: 'admin-with-author-id@bookleaf.test',
      passwordHash: samplePasswordHash,
      role: ROLES.ADMIN,
      authorId: 'AUTH001',
    });

    await expect(user.validate()).rejects.toThrow(/Author source identifier is required/);
  });

  it('enforces unique email through the database index', async () => {
    await User.create({
      email: 'duplicate@bookleaf.test',
      passwordHash: samplePasswordHash,
      role: ROLES.ADMIN,
    });

    await expect(
      User.create({
        email: 'duplicate@bookleaf.test',
        passwordHash: samplePasswordHash,
        role: ROLES.ADMIN,
      }),
    ).rejects.toThrow(/duplicate key/i);
  });

  it('enforces unique author source identifier when present', async () => {
    await User.create({
      email: 'author1@bookleaf.test',
      passwordHash: samplePasswordHash,
      role: ROLES.AUTHOR,
      authorId: 'AUTH001',
      name: 'Author One',
    });

    await expect(
      User.create({
        email: 'author2@bookleaf.test',
        passwordHash: samplePasswordHash,
        role: ROLES.AUTHOR,
        authorId: 'AUTH001',
        name: 'Author Two',
      }),
    ).rejects.toThrow(/duplicate key/i);
  });

  it('does not return password hash by default', async () => {
    await User.create({
      email: 'secure@bookleaf.test',
      passwordHash: samplePasswordHash,
      role: ROLES.ADMIN,
    });

    const found = await User.findOne({ email: 'secure@bookleaf.test' });
    expect(found.passwordHash).toBeUndefined();

    const foundWithHash = await User.findOne({ email: 'secure@bookleaf.test' }).select('+passwordHash');
    expect(foundWithHash.passwordHash).toBe(samplePasswordHash);
  });
});
