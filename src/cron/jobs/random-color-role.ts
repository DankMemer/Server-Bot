import { CONFIG } from '../../config';
import { discordClient } from '../../lib/discord-client';
import { Job } from '../job';

export class RandomColorRoleJob extends Job {
  public interval = '0 0 * * *';
  public async execute(): Promise<void> {
    const guild = discordClient.bot.guilds.cache.get(CONFIG.ids.servers.dmc);

    await guild.roles.edit(CONFIG.ids.roles.dmc.randomColor, {
      color: Math.floor(Math.random() * 0xFFFFFF),
    });
  }
}
