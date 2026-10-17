import mongoose from 'mongoose';

export const clearDatabase = async () => {
  const { collections } = mongoose.connection;

  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
};

export const samplePasswordHash = '$2b$10$test.hash.placeholder.for.model.tests.only';
