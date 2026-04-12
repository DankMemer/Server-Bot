import { CONFIG } from '../../config';
import { discordClient } from '../../lib/discord-client';
import { prismaClient } from '../../lib/prisma-client';
import { Job } from '../job';

export class BirthdayRoleJob extends Job {
  public interval = '* * * * *';
  public async execute(): Promise<void> {
    const expired = await prismaClient.birthdayRole.findMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    });

    for (const entry of expired) {
      const guild = discordClient.bot.guilds.cache.get(entry.guildID.toString());

      if (guild) {
        const member = await guild.members.fetch(entry.userID.toString()).catch(() => null);

        if (member?.roles.cache.has(CONFIG.ids.roles.dmc.birthday)) {
          await member.roles.remove(CONFIG.ids.roles.dmc.birthday, 'Server birthday ended')
            .catch(() => null);
        }
      }

      await prismaClient.birthdayRole.delete({
        where: {
          id: entry.id,
        },
      });
    }
  }
}
