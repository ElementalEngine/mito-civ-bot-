import mongoose from "mongoose";
import client from "./client";
import { config } from "./config";
import { initializeDatabase } from "./database";

async function main(): Promise<void> {
  try {
    console.log(`⚙️ Starting application in ${config.env} mode...`);

    await initializeDatabase();

    await client.login(config.discord.token);
    console.log(`🟢 Discord client ready as ${client.user?.tag}`);

    const shutdown = async (): Promise<void> => {
      console.log("⚙️ Shutdown initiated...");
      try {
        await mongoose.disconnect();
        console.log("🔴 MongoDB disconnected");
      } catch (e) {
        console.error("Mongo disconnect error:", e);
      }
      try {
        client.destroy();
        console.log("🔴 Discord client destroyed");
      } catch (e) {
        console.error("Discord client destroy error:", e);
      }
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    process.on("unhandledRejection", reason => {
      console.error("⚠️ Unhandled Rejection:", reason);
    });
  } catch (err) {
    console.error("🛑 Startup error:", err);
    process.exit(1);
  }
}

void main();