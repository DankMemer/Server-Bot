import { scheduleCronJobs } from './cron';
import { discordClient } from './lib/discord-client';
import { logger } from './lib/logger';
import { memerClient } from './lib/memer-client';
import { prismaClient } from './lib/prisma-client';
import { redisClient } from './lib/redis-client';

async function init(): Promise<void> {
  logger.info('Starting the bot...');

  await Promise.all([
    redisClient.connect(),
    prismaClient.$connect(),
    discordClient.connect(),
    memerClient.init(),
    scheduleCronJobs(),
  ]);
}

if (require.main === module) {
  init()
    .catch(error => {
      logger.error(`Failed to init: ${error}`);
    });
}
