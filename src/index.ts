import * as Sentry from '@sentry/node';
import { scheduleCronJobs } from './cron';
import { discordClient } from './lib/discord-client';
import { logger } from './lib/logger';
import { memerClient } from './lib/memer-client';
import { prismaClient } from './lib/prisma-client';
import { redisClient } from './lib/redis-client';

Sentry.init({
  dsn: 'https://1b2ae4fadb5affb0a5ba513351736897@o363727.ingest.sentry.io/4506581886107648',
  tracesSampleRate: 1,
});

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
      Sentry.captureException(error);
    });
}
