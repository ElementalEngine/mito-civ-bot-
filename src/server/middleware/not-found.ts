import { Request, Response, NextFunction } from 'express';
import createHttpError from 'http-errors';

/**
 * 404 handler: forward as HTTPError to errorHandler.
 */
export default function notFoundHandler(
  _req: Request,
  _res: Response,
  next: NextFunction
) {
  next(createHttpError(404));
}