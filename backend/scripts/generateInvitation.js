import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, disconnectDB } from '../src/config/database.js';
import { loadConfig } from '../src/config/index.js';
import { hashToken } from '../src/utils/password.js';
import AuthorInvitation from '../src/modules/users/authorInvitation.model.js';
import User from '../src/modules/users/user.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--email') {
      options.email = args[index + 1];
      index += 1;
    } else if (arg === '--author-id') {
      options.authorId = args[index + 1];
      index += 1;
    } else if (arg === '--name') {
      options.name = args[index + 1];
      index += 1;
    } else if (arg === '--days') {
      options.days = Number(args[index + 1]);
      index += 1;
    }
  }

  return options;
};

const run = async () => {
  const options = parseArgs();

  if (!options.email || !options.authorId || !options.name) {
    console.error(
      'Usage: node scripts/generateInvitation.js --email <email> --author-id <AUTH001> --name "Author Name" [--days 7]',
    );
    process.exit(1);
  }

  const config = loadConfig();
  await connectDB(config.mongodbUri);

  const existingUser = await User.findOne({
    $or: [{ email: options.email.toLowerCase() }, { authorId: options.authorId }],
  });

  if (existingUser) {
    console.error('An account already exists for this author.');
    process.exit(1);
  }

  const plainToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = await hashToken(plainToken);
  const expiresAt = new Date(Date.now() + (options.days || 7) * 24 * 60 * 60 * 1000);

  await AuthorInvitation.findOneAndUpdate(
    { email: options.email.toLowerCase(), authorId: options.authorId },
    {
      email: options.email.toLowerCase(),
      authorId: options.authorId,
      name: options.name,
      tokenHash,
      expiresAt,
      usedAt: null,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  console.log('Invitation created successfully.');
  console.log(`Email: ${options.email.toLowerCase()}`);
  console.log(`Author ID: ${options.authorId}`);
  console.log(`Expires: ${expiresAt.toISOString()}`);
  console.log('One-time invitation token (store securely and share out-of-band):');
  console.log(plainToken);

  await disconnectDB();
};

run().catch(async (error) => {
  console.error('Failed to generate invitation:', error.message);
  await disconnectDB();
  process.exit(1);
});
