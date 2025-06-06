import { setTimeout } from 'node:timers';
import { Message } from 'discord.js';
import HolyTime from 'holy-time';
import { CONFIG } from '../../config';
import { discordClient } from '../../lib/discord-client';

const REGEX = /Congratulations|endgame/g;

export function advancementsHandler(message: Message): void {
  if (message.channel.id !== CONFIG.ids.channels.dmc.prestigeOmegaHere) {
    return;
  }

  const embedDescription = message.embeds[0]?.description ?? '';

  if ((REGEX).test(embedDescription) && message.author.id === discordClient.bot.user.id) {
    return;
  }

  setTimeout(() => message.delete(), HolyTime.Units.SECOND * 3);
}
