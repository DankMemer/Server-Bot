import { discordClient } from '../../lib/discord-client';
import { prismaClient } from '../../lib/prisma-client';
import { markActionInFlight } from '../../utils/moderation-action-cache';
import { Job } from '../job';

export class TemporaryBanJob extends Job {
  public interval = '* * * * *';
  public async execute(): Promise<void> {
    const temporaryBans = await prismaClient.tempBan.findMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    });

    for (const temporaryBan of temporaryBans) {
      await prismaClient.tempBan.delete({
        where: {
          id: temporaryBan.id,
        },
      });

      const guild = discordClient.bot.guilds.cache.get(temporaryBan.guildID.toString());

      if (!guild) {
        continue;
      }

      markActionInFlight(guild.id, temporaryBan.userID.toString(), 'UNBAN');
      await guild.members.unban(temporaryBan.userID.toString(), 'Temporary Ban ended');
    }
  }
}
