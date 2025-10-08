import { Message } from 'discord.js';
import HolyTime from 'holy-time';
import { setTimeout } from 'node:timers';
import { CONFIG } from '../../config';
import { discordClient } from '../../lib/discord-client';

const REGEX = /Congratulations|endgame/g;

export async function advancementsHandler(message: Message): Promise<void> {
  if (message.channel.id !== CONFIG.ids.channels.dmc.prestigeOmegaHere) {
    return;
  }

  const embedDescription = message.embeds[0]?.description ?? '';

  if ((REGEX).test(embedDescription) && message.author.id === discordClient.bot.user.id) {
    return;
  }

  setTimeout(async () => await message.delete(), HolyTime.Units.SECOND * 3);
}
