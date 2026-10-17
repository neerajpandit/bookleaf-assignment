import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../../config/database.js';
import { hashPassword } from '../../utils/password.js';
import { ROLES } from '../../constants/roles.js';
import User from '../users/user.model.js';
import Book from '../books/book.model.js';
import { DEFAULT_DATASET_PATH } from './constants.js';
import { loadDataset } from './dataset.js';
import { mapAuthorProfile, mapBookDocument } from './mappers.js';
import { validateSeedEnvironment } from './seedConfig.js';
import { verifySeedResults } from './verifySeed.js';

const createEmptySummary = () => ({
  success: false,
  authors: { processed: 0, created: 0, updated: 0 },
  books: { processed: 0, created: 0, updated: 0 },
  admin: { created: false, skipped: false },
  warnings: [],
  errors: [],
  verification: null,
});

const buildAuthorProfileUpdate = (profile) => ({
  email: profile.email,
  name: profile.name,
  phone: profile.phone,
  city: profile.city,
  joinedDate: profile.joinedDate,
});

export const seedAuthors = async (authors, authorDefaultPassword, summary) => {
  const authorObjectIds = new Map();

  for (const author of authors) {
    summary.authors.processed += 1;

    const profile = mapAuthorProfile(author);
    let user = await User.findOne({ authorId: profile.authorId }).select('+passwordHash');

    if (user) {
      if (!user.passwordHash) {
        summary.warnings.push({
          type: 'MISSING_PASSWORD_HASH',
          authorId: profile.authorId,
          message:
            'Existing author account has no password hash. Credentials were not modified. Use the approved invitation/provisioning flow.',
        });
      }

      const emailOwner = await User.findOne({
        email: profile.email,
        _id: { $ne: user._id },
      });

      if (emailOwner) {
        throw new Error(
          `Seed error: email ${profile.email} is already used by another account while seeding author ${profile.authorId}.`,
        );
      }

      await User.updateOne({ _id: user._id }, { $set: buildAuthorProfileUpdate(profile) });
      summary.authors.updated += 1;
      authorObjectIds.set(profile.authorId, user._id);
      continue;
    }

    const existingByEmail = await User.findOne({ email: profile.email }).select('+passwordHash');

    if (existingByEmail) {
      throw new Error(
        `Seed error: email ${profile.email} already belongs to an account without matching authorId ${profile.authorId}.`,
      );
    }

    const passwordHash = await hashPassword(authorDefaultPassword);

    user = await User.create({
      ...buildAuthorProfileUpdate(profile),
      authorId: profile.authorId,
      passwordHash,
      role: ROLES.AUTHOR,
      isActive: true,
      tokenVersion: 0,
    });

    summary.authors.created += 1;
    authorObjectIds.set(profile.authorId, user._id);
  }

  return authorObjectIds;
};

export const seedAdmin = async ({ adminEmail, adminPassword }, summary) => {
  const existing = await User.findOne({ email: adminEmail }).select('+passwordHash');

  if (existing) {
    if (existing.role !== ROLES.ADMIN) {
      throw new Error(
        `Seed error: configured ADMIN_EMAIL (${adminEmail}) belongs to an existing non-admin account.`,
      );
    }

    summary.admin.skipped = true;
    return existing;
  }

  const passwordHash = await hashPassword(adminPassword);

  const admin = await User.create({
    email: adminEmail,
    passwordHash,
    role: ROLES.ADMIN,
    isActive: true,
    tokenVersion: 0,
  });

  summary.admin.created = true;
  return admin;
};

export const seedBooks = async (datasetBooks, authorObjectIds, summary) => {
  for (const { authorId, book } of datasetBooks) {
    summary.books.processed += 1;

    const authorObjectId = authorObjectIds.get(authorId);

    if (!authorObjectId) {
      summary.errors.push({
        type: 'MISSING_AUTHOR_REFERENCE',
        bookId: book.book_id,
        authorId,
      });
      continue;
    }

    const bookDocument = mapBookDocument(book, authorObjectId);
    const existing = await Book.findOne({ bookId: book.book_id }).select('_id');

    await Book.findOneAndUpdate(
      { bookId: book.book_id },
      { $set: bookDocument },
      { upsert: true, new: true, runValidators: true },
    );

    if (existing) {
      summary.books.updated += 1;
    } else {
      summary.books.created += 1;
    }
  }

  if (summary.errors.length > 0) {
    throw new Error(
      `Seed error: ${summary.errors.length} book record(s) could not be linked to an author.`,
    );
  }
};

export const runSeed = async (options = {}) => {
  const summary = createEmptySummary();
  const {
    datasetPath = DEFAULT_DATASET_PATH,
    manageConnection = true,
    skipConfirm = false,
    skipProductionGuard = false,
    seedConfig: providedSeedConfig = null,
  } = options;

  const wasConnectedBeforeSeed = mongoose.connection.readyState === 1;

  try {
    const seedConfig = providedSeedConfig
      || validateSeedEnvironment(process.env, { skipConfirm, skipProductionGuard });

    const dataset = await loadDataset(datasetPath);

    if (manageConnection && !wasConnectedBeforeSeed) {
      await connectDB(seedConfig.mongodbUri);
    }

    const authorObjectIds = await seedAuthors(
      dataset.authors,
      seedConfig.authorDefaultPassword,
      summary,
    );

    await seedAdmin(seedConfig, summary);
    await seedBooks(dataset.books, authorObjectIds, summary);

    summary.verification = await verifySeedResults(dataset);

    if (!summary.verification.valid) {
      throw new Error('Seed verification failed after import.');
    }

    summary.success = true;
    return summary;
  } catch (error) {
    summary.success = false;

    if (!summary.errors.some((entry) => entry.type === 'RUNTIME')) {
      summary.errors.push({
        type: 'RUNTIME',
        message: error.message,
      });
    }

    throw Object.assign(error, { seedSummary: summary });
  } finally {
    if (manageConnection && !wasConnectedBeforeSeed) {
      await disconnectDB();
    }
  }
};

export default runSeed;
