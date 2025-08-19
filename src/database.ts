import mongoose from "mongoose";
import { config } from "./config";

const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_DELAY_MS = 3000;

function delay(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

export async function initializeDatabase(): Promise<void> {
  const uri = config.mongoDb;
  if (!uri) {
    console.error("❌ MongoDB URI is not defined. Check your environment variables.");
    process.exit(1);
  }

  if (mongoose.connection.readyState === 1) return;
  if (mongoose.connection.readyState === 2) {
    await new Promise<void>(res => mongoose.connection.once("connected", () => res()));
    return;
  }

  // Basic telemetry
  mongoose.connection.on("connected", () => console.log("✅ MongoDB connected"));
  mongoose.connection.on("disconnected", () => console.warn("⚠️ MongoDB disconnected"));
  mongoose.connection.on("error", err => console.error("🛑 MongoDB connection error:", err));

  let attempt = 0;
  while (attempt < DEFAULT_RETRY_ATTEMPTS) {
    attempt++;
    try {
      await mongoose.connect(uri, {
        autoIndex: true,
        autoCreate: true,
        serverSelectionTimeoutMS: 5000, 
      });
      return; // success
    } catch (err) {
      console.error(`❌ MongoDB connect attempt ${attempt} failed:`, (err as Error).message);
      if (attempt >= DEFAULT_RETRY_ATTEMPTS) break;

      const wait = Math.round(BASE_DELAY_MS * Math.pow(2, attempt - 1) * (0.9 + Math.random() * 0.2));
      console.log(`⏳ Retrying in ${wait}ms...`);
      await delay(wait);
    }
  }

  console.error("❌ Exceeded max retry attempts. Exiting.");
  process.exit(1);
}

export function isDatabaseHealthy(): boolean {
  return mongoose.connection.readyState === 1;
}