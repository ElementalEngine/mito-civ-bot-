import mongoose from "mongoose";
import { config } from "./config";

export async function initializeDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.mongoDb, {
      autoIndex: true,
      autoCreate: true,
    });
    console.log('✅ Connected to MongoDB:', config.mongoDb);
  } catch (err) {
    console.error ('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}