import client from './client';
import app from './server/app';
import http from 'http';
import { config } from './config';

async function main() {
  try {
    await client.login(config.discord.token);

    const server = http.createServer(app);
    server.listen(config.port, config.host, () =>
      console.log(`HTTP server listening at http://${config.host}:${config.port}`)
    );

    const shutdown = () => {
      console.log('Shutting down...');
      server.close(() => client.destroy());
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
}

main();
