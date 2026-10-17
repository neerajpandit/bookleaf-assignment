import mongoose from 'mongoose';

const sanitizeUri = (uri) => uri.replace(/\/\/([^@/]+)@/, '//***@');

export const connectDB = async (uri) => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  mongoose.set('strictQuery', true);

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
  });

  await mongoose.connect(uri);
  console.log(`MongoDB connected (${sanitizeUri(uri)})`);

  return mongoose.connection;
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
};

export const isDbConnected = () => mongoose.connection.readyState === 1;
