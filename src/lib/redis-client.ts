import { createClient } from 'redis';
import { CONFIG } from '../config';
import { logger } from './logger';

export const redisClient = createClient({
  url: CONFIG.redis.url,
  password: CONFIG.redis.password,
});

redisClient.on('error', (error) => logger.warn(`Redis ${error}`));
