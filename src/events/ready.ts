import { ActivityType, PresenceUpdateStatus } from 'discord.js';
import { discordClient } from '../lib/discord-client';
import { logger } from '../lib/logger';

export default function ready(): void {
  discordClient.bot.user.setActivity('you', {
    type: ActivityType.Watching,
  });
  discordClient.bot.user.setStatus(PresenceUpdateStatus.DoNotDisturb);

  // TODO: cache members

  logger.info(`Ready as ${discordClient.bot.user.username}.`);
}
