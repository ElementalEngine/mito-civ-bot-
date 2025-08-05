import { Request, Response, NextFunction } from 'express';
import { config } from '../../config';

/**
 * Global error handler: returns JSON error responses; logs 5xx.
 */
export default function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const status = err.status || 500;
  const payload: any = { error: err.message || 'Internal Server Error' };
  if (config.env === 'development' && err.stack) {
    payload.stack = err.stack;
  }
  if (status >= 500) {
    console.error('Server error:', err);
  }
  res.status(status).json(payload);
}
