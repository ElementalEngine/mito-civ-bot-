import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import express from 'express';
import { config } from '../../config';

import rateLimiter from './rate-limiter';
import logger from './logger';
import notFoundHandler from './not-found';
import errorHandler from './error-handler';

/**
 * Apply all global middleware to the express App.
 */
export function applyMiddleware(app: express.Express) {
  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: config.env === 'production' ? undefined : false,
    })
  );

  // CORS
  app.use(cors(config.cors));

  // Compression
  app.use(compression());

  // Rate limiting
  app.use(rateLimiter);

  // HTTP logging
  app.use(logger);

  // Body parsing
  app.use(express.json({ limit: '50kb' }));
  app.use(express.urlencoded({ extended: false, limit: '50kb' }));

  // 404 and error handling will be added in app.ts
  app.use(notFoundHandler);
  app.use(errorHandler);
}
