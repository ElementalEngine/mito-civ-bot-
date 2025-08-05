import express, { Request, Response } from 'express';
import { config } from '../config';
import routes from './routes';
import { applyMiddleware } from './middleware';

const app = express();

// Apply global middleware: security headers, CORS, compression, rate limiting, logging, parsers, and error handlers
applyMiddleware(app);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => res.sendStatus(200));

// Mount all API routes under /api
app.use('/api', routes());

export default app;