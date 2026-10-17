import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { comparePassword, hashPassword } from '../../src/utils/password.js';
import { ROLES } from '../../src/constants/roles.js';
import User from '../../src/modules/users/user.model.js';
import Book from '../../src/modules/books/book.model.js';
import { loadDataset } from '../../src/modules/seed/dataset.js';
import { validateSeedEnvironment } from '../../src/modules/seed/seedConfig.js';
import { runSeed } from '../../src/modules/seed/seed.service.js';
import {
  DEMO_ADMIN_PASSWORD,
  DEMO_AUTHOR_PASSWORD,
} from '../../src/modules/seed/constants.js';
import { connectDB, disconnectDB } from '../../src/config/database.js';
import { setupTestDb, teardownTestDb } from '../setup/testDb.js';
import {
  buildSeedConfig,
  buildSeedEnv,
  duplicateBooksDatasetPath,
  fullDatasetPath,
  sampleDatasetPath,
} from '../helpers/seedHelper.js';

const seedOptions = (overrides = {}) => ({
  datasetPath: sampleDatasetPath,
  manageConnection: false,
  skipConfirm: true,
  skipProductionGuard: true,
  seedConfig: buildSeedConfig(),
  ...overrides,
});

describe('Database seeding', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Book.deleteMany({})]);
  });

  describe('runSeed', () => {
    it('imports authors and books successfully', async () => {
      const summary = await runSeed(seedOptions());

      expect(summary.success).toBe(true);
      expect(summary.authors.processed).toBe(2);
      expect(summary.authors.created).toBe(2);
      expect(summary.books.processed).toBe(3);
      expect(summary.books.created).toBe(3);
      expect(summary.admin.created).toBe(true);
      expect(summary.verification.valid).toBe(true);

      const authorCount = await User.countDocuments({ role: ROLES.AUTHOR });
      const bookCount = await Book.countDocuments();

      expect(authorCount).toBe(2);
      expect(bookCount).toBe(3);
    });

    it('maps each book to the correct author user', async () => {
      await runSeed(seedOptions());

      const priya = await User.findOne({ authorId: 'AUTH001' });
      const rohit = await User.findOne({ authorId: 'AUTH002' });

      const priyaBooks = await Book.find({ author: priya._id }).sort({ bookId: 1 });
      const rohitBooks = await Book.find({ author: rohit._id });

      expect(priyaBooks.map((book) => book.bookId)).toEqual(['BK001', 'BK013']);
      expect(rohitBooks.map((book) => book.bookId)).toEqual(['BK003']);
    });

    it('is idempotent on repeated execution', async () => {
      const first = await runSeed(seedOptions());
      const firstAuthorHashes = await User.find({ role: ROLES.AUTHOR }).select('+passwordHash');
      const firstBookCount = await Book.countDocuments({});

      const second = await runSeed(seedOptions());
      const secondAuthorHashes = await User.find({ role: ROLES.AUTHOR }).select('+passwordHash');
      const secondBookCount = await Book.countDocuments({});

      expect(first.success).toBe(true);
      expect(second.success).toBe(true);
      expect(second.authors.created).toBe(0);
      expect(second.authors.updated).toBe(2);
      expect(second.books.created).toBe(0);
      expect(second.books.updated).toBe(3);
      expect(firstBookCount).toBe(3);
      expect(secondBookCount).toBe(3);
      expect(secondAuthorHashes.map((user) => user.passwordHash)).toEqual(
        firstAuthorHashes.map((user) => user.passwordHash),
      );
    });

    it('preserves existing password hashes on reseed', async () => {
      const customPassword = 'ExistingAuthorPass1';
      const passwordHash = await hashPassword(customPassword);

      await User.create({
        email: 'priya.sharma@email.com',
        authorId: 'AUTH001',
        passwordHash,
        role: ROLES.AUTHOR,
        name: 'Priya Sharma',
        isActive: true,
        tokenVersion: 0,
      });

      await runSeed(seedOptions());

      const user = await User.findOne({ authorId: 'AUTH001' }).select('+passwordHash');
      const matchesExisting = await comparePassword(customPassword, user.passwordHash);
      const matchesSeedDefault = await comparePassword(DEMO_AUTHOR_PASSWORD, user.passwordHash);

      expect(matchesExisting).toBe(true);
      expect(matchesSeedDefault).toBe(false);
    });

    it('preserves existing roles and security settings on reseed', async () => {
      const passwordHash = await hashPassword('ExistingAuthorPass1');

      await User.create({
        email: 'priya.sharma@email.com',
        authorId: 'AUTH001',
        passwordHash,
        role: ROLES.AUTHOR,
        name: 'Priya Sharma',
        isActive: false,
        tokenVersion: 7,
      });

      await runSeed(seedOptions());

      const user = await User.findOne({ authorId: 'AUTH001' });
      expect(user.role).toBe(ROLES.AUTHOR);
      expect(user.isActive).toBe(false);
      expect(user.tokenVersion).toBe(7);
    });

    it('hashes passwords for newly provisioned accounts', async () => {
      await runSeed(seedOptions());

      const author = await User.findOne({ authorId: 'AUTH001' }).select('+passwordHash');
      const admin = await User.findOne({ email: 'admin@bookleaf.test' }).select('+passwordHash');

      expect(await comparePassword(DEMO_AUTHOR_PASSWORD, author.passwordHash)).toBe(true);
      expect(await comparePassword(DEMO_ADMIN_PASSWORD, admin.passwordHash)).toBe(true);
    });

    it('preserves nullable in-production book fields and royalty values', async () => {
      await runSeed(seedOptions());

      const inProduction = await Book.findOne({ bookId: 'BK013' });
      const published = await Book.findOne({ bookId: 'BK001' });

      expect(inProduction.publicationDate).toBeNull();
      expect(inProduction.mrp).toBeNull();
      expect(inProduction.authorRoyaltyPerCopy).toBeNull();
      expect(inProduction.printPartner).toBeNull();
      expect(inProduction.lastRoyaltyPayoutDate).toBeNull();
      expect(inProduction.availableOn).toEqual([]);

      expect(published.totalCopiesSold).toBe(342);
      expect(published.totalRoyaltyEarned).toBe(11970);
      expect(published.royaltyPaid).toBe(8400);
      expect(published.royaltyPending).toBe(3570);
    });

    it('reports missing password hashes without overwriting credentials', async () => {
      await User.collection.insertOne({
        email: 'priya.sharma@email.com',
        authorId: 'AUTH001',
        role: ROLES.AUTHOR,
        name: 'Priya Sharma',
        isActive: true,
        tokenVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const summary = await runSeed(seedOptions());

      expect(summary.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'MISSING_PASSWORD_HASH',
            authorId: 'AUTH001',
          }),
        ]),
      );

      const user = await User.findOne({ authorId: 'AUTH001' }).select('+passwordHash');
      expect(user.passwordHash).toBeUndefined();
    });

    it('fails when configured admin email belongs to a non-admin account', async () => {
      const passwordHash = await hashPassword('AuthorPass123');

      await User.create({
        email: 'admin@bookleaf.test',
        passwordHash,
        role: ROLES.AUTHOR,
        authorId: 'AUTH999',
        name: 'Not Admin',
        isActive: true,
      });

      await expect(runSeed(seedOptions())).rejects.toThrow(
        /configured ADMIN_EMAIL .* belongs to an existing non-admin account/,
      );
    });

    it('imports the full assignment dataset without duplicates', async () => {
      const summary = await runSeed(
        seedOptions({
          datasetPath: fullDatasetPath,
        }),
      );

      expect(summary.success).toBe(true);
      expect(summary.authors.processed).toBe(10);
      expect(summary.books.processed).toBe(18);
      expect(summary.verification.importedAuthorCount).toBe(10);
      expect(summary.verification.importedBookCount).toBe(18);
    });
  });

  describe('validateSeedEnvironment', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it('refuses default demo passwords in production', () => {
      expect(() =>
        validateSeedEnvironment(
          buildSeedEnv({
            NODE_ENV: 'production',
            SEED_AUTHOR_DEFAULT_PASSWORD: DEMO_AUTHOR_PASSWORD,
            ADMIN_PASSWORD: 'StrongAdminPass1!',
            ALLOW_PRODUCTION_SEED: 'true',
          }),
        ),
      ).toThrow(/SEED_AUTHOR_DEFAULT_PASSWORD cannot use the local demo value/);

      expect(() =>
        validateSeedEnvironment(
          buildSeedEnv({
            NODE_ENV: 'production',
            SEED_AUTHOR_DEFAULT_PASSWORD: 'StrongAuthorPass1!',
            ADMIN_PASSWORD: DEMO_ADMIN_PASSWORD,
            ALLOW_PRODUCTION_SEED: 'true',
          }),
        ),
      ).toThrow(/ADMIN_PASSWORD cannot use the local demo value/);
    });

    it('fails when required administrator configuration is missing', () => {
      expect(() =>
        validateSeedEnvironment({
          NODE_ENV: 'test',
          MONGODB_URI: process.env.MONGODB_URI,
          SEED_CONFIRM: 'yes',
          SEED_AUTHOR_DEFAULT_PASSWORD: DEMO_AUTHOR_PASSWORD,
        }),
      ).toThrow(/ADMIN_EMAIL is required/);
    });

    it('requires explicit seed confirmation outside tests', () => {
      expect(() =>
        validateSeedEnvironment(
          buildSeedEnv({
            SEED_CONFIRM: undefined,
          }),
        ),
      ).toThrow(/SEED_CONFIRM=yes is required/);
    });
  });

  describe('loadDataset', () => {
    it('rejects duplicate source book identifiers', async () => {
      await expect(loadDataset(duplicateBooksDatasetPath)).rejects.toThrow(
        /duplicate book_id values detected: BK001/,
      );
    });
  });

});

describe('Database seeding connection lifecycle', () => {
  let memoryServer;

  beforeEach(async () => {
    if (mongoose.connection.readyState !== 0) {
      await disconnectDB();
    }

    memoryServer = await MongoMemoryServer.create();
  });

  afterEach(async () => {
    if (mongoose.connection.readyState !== 0) {
      await disconnectDB();
    }

    if (memoryServer) {
      await memoryServer.stop();
      memoryServer = null;
    }
  });

  it('closes the MongoDB connection after a successful seed run', async () => {
    const uri = memoryServer.getUri();

    const summary = await runSeed({
      datasetPath: sampleDatasetPath,
      manageConnection: true,
      skipConfirm: true,
      skipProductionGuard: true,
      seedConfig: buildSeedConfig({ mongodbUri: uri }),
    });

    expect(summary.success).toBe(true);
    expect(mongoose.connection.readyState).toBe(0);
  });

  it('closes the MongoDB connection after a failed seed run', async () => {
    const uri = memoryServer.getUri();
    await connectDB(uri);

    const passwordHash = await hashPassword('AuthorPass123');
    await User.create({
      email: 'admin@bookleaf.test',
      passwordHash,
      role: ROLES.AUTHOR,
      authorId: 'AUTH999',
      name: 'Not Admin',
      isActive: true,
    });
    await disconnectDB();

    await expect(
      runSeed({
        datasetPath: sampleDatasetPath,
        manageConnection: true,
        skipConfirm: true,
        skipProductionGuard: true,
        seedConfig: buildSeedConfig({ mongodbUri: uri }),
      }),
    ).rejects.toThrow(/non-admin account/);

    expect(mongoose.connection.readyState).toBe(0);
  });
});
