import mongoose from 'mongoose';
import { config } from './config';

const DEFAULT_RETRY_ATTEMPTS = 3;
const RETRY_INTERVAL_MS = 3000;

/**
 * Initialize MongoDB connection with retry logic and proper event handling.
 */
export async function initializeDatabase(): Promise<void> {
  const uri = config.mongoDb;
  if (!uri) {
    console.error('❌ MongoDB URI is not defined. Check your environment variables.');
    process.exit(1);
  }

  let attempts = 0;

  const connectWithRetry = async (): Promise<void> => {
    try {
      await mongoose.connect(uri, {
        autoIndex: true,
        autoCreate: true,
      });
      console.log('✅ Connected to MongoDB');
    } catch (err) {
      attempts++;
      console.error(
        `❌ MongoDB connection attempt ${attempts} failed:`,
        (err as Error).message
      );

      if (attempts < DEFAULT_RETRY_ATTEMPTS) {
        const delay = RETRY_INTERVAL_MS;
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
        return connectWithRetry();
      }

      console.error('❌ Exceeded max retry attempts. Exiting.');
      process.exit(1);
    }
  };

  // Listen for ongoing connection errors
  mongoose.connection.on('error', error => {
    console.error('MongoDB connection error:', error);
  });

  await connectWithRetry();
}

/**
 * Checks if MongoDB connection is healthy (connected).
 */
export function isDatabaseHealthy(): boolean {
  return mongoose.connection.readyState === 1;
}