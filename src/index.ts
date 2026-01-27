import client from "./client.js";
import { config } from "./config.js";

async function main(): Promise<void> {
  try {
    console.log(`⚙️ Starting application in ${config.env} mode...`);

    await client.login(config.discord.token);
    console.log(`🟢 Discord client ready as ${client.user?.tag}`);

    let isShuttingDown = false;
    const shutdown = async (
      signal: NodeJS.Signals,
      exitCode = 0
    ): Promise<void> => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      console.log(`⚙️ Shutdown initiated (${signal})...`);

      // Ensure we don't hang indefinitely on shutdown (systemd stop timeout, etc.)
      const forceExitTimer = setTimeout(() => {
        console.error("🛑 Forced shutdown after timeout");
        process.exit(1);
      }, 10_000);
      // Don't keep the event loop alive just because of the timer.
      forceExitTimer.unref();

      try {
        client.destroy();
        console.log("🔴 Discord client destroyed");
      } catch (e) {
        console.error("Discord client destroy error:", e);
      }

      process.exit(exitCode);
    };

    process.on("SIGINT", () => {
      void shutdown("SIGINT", 0);
    });
    process.on("SIGTERM", () => {
      void shutdown("SIGTERM", 0);
    });

    process.on("unhandledRejection", (reason: unknown) => {
      console.error("⚠️ Unhandled Rejection:", reason);
    });

    process.on("uncaughtException", (err: unknown) => {
      console.error("🛑 Uncaught Exception:", err);
      void shutdown("SIGTERM", 1);
    });
  } catch (err: unknown) {
    console.error("🛑 Startup error:", err);
    process.exit(1);
  }
}

void main();