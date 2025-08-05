
import rateLimit from 'express-rate-limit';
import { config } from '../../config';

/**
 * Global rate limiter: limits each IP to X requests per windowMs
 */
export default rateLimit({
  windowMs: config.rateLimit.windowMs,  // e.g. 15 * 60 * 1000
  max: config.rateLimit.max,            // e.g. 100
  standardHeaders: true,                // Return rate limit info in the RateLimit-* headers
  legacyHeaders: false,                 // Disable X-RateLimit-* headers
});