import { MongoMemoryServer } from 'mongodb-memory-server';
import { resetConfigCache } from '../../src/config/index.js';

let mongoServer = null;

export const setupTestDb = async () => {
  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create();
  }

  process.env.MONGODB_URI = mongoServer.getUri();
  resetConfigCache();

  const { connectDB } = await import('../../src/config/database.js');
  await connectDB(process.env.MONGODB_URI);
};

export const teardownTestDb = async () => {
  const { disconnectDB } = await import('../../src/config/database.js');
  await disconnectDB();

  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }

  resetConfigCache();
};
