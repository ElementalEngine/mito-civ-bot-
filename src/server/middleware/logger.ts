import morgan from 'morgan';
import { config } from '../../config';

/**
 * HTTP request logger. 'dev' for development, 'combined' for production.
 */
export default morgan(
  config.env === 'development' ? 'dev' : 'combined'
);