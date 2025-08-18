import mongoose from 'mongoose';
import client from './client';
import app from './server/app';
import http from 'http';
import { config } from './config';
import { initializeDatabase } from './database';

async function main(): Promise<void> {
  try {
    console.log(`⚙️ Starting application in ${config.env} mode...`);

    await initializeDatabase();

    await client.login(config.discord.token);
    console.log(`🟢 Discord client ready as ${client.user?.tag}`);

    const server = http.createServer(app);
    server.listen(config.port, config.host, () => {
      console.log(`🌐 HTTP server listening at http://${config.host}:${config.port}`);
    });

    const shutdown = async (): Promise<void> => {
      console.log('⚙️ Shutdown initiated...');
      server.close(async () => {
        console.log('🔴 HTTP server closed');
        await mongoose.disconnect();
        console.log('🔴 MongoDB disconnected');
        client.destroy();
        console.log('🔴 Discord client destroyed');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    process.on('unhandledRejection', reason => {
      console.error('⚠️ Unhandled Rejection:', reason);
    });
  } catch (err) {
    console.error('🛑 Startup error:', err);
    process.exit(1);
  }
}

main();