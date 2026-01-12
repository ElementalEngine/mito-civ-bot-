import client from "./client";
import { config } from "./config";

async function main(): Promise<void> {
  try {
    console.log(`⚙️ Starting application in ${config.env} mode...`);

    await client.login(config.discord.token);
    console.log(`🟢 Discord client ready as ${client.user?.tag}`);

    const shutdown = async (): Promise<void> => {
      console.log("⚙️ Shutdown initiated...");
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