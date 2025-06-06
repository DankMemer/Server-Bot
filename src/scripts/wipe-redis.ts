import { logger } from '../lib/logger';
import { redisClient } from '../lib/redis-client';

async function init(): Promise<void> {
  await redisClient.connect();
  await redisClient.flushAll();
}

if (require.main === module) {
  init()
    .catch(error => {
      logger.error(`Failed to init: ${error}`);
    });
}

