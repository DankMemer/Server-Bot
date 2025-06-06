import { CONFIG } from '../../config';
import { discordClient } from '../../lib/discord-client';
import { prismaClient } from '../../lib/prisma-client';
import { Job } from '../job';

export class TemporaryBanJob extends Job {
  public interval = '* * * * *';
  public async execute(): Promise<void> {
    const guild = discordClient.bot.guilds.cache.get(CONFIG.ids.servers.dmc);

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

      await guild.members.unban(temporaryBan.userID.toString(), 'Temporary Ban ended');
    }
  }
}
