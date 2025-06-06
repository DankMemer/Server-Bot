import { ChannelType, Message } from 'discord.js';
import { CONFIG } from '../../config';

const WHITELISTED_ROLES = [
  CONFIG.ids.roles.dmc.trialModerator,
  CONFIG.ids.roles.dmc.giveawayManager,
  CONFIG.ids.roles.dmc.moderator,
  CONFIG.ids.roles.dmo.moderator,
];
const DISCORD_ID_REGEX = /\d{17,19}/g;

export function listHandler(message: Message): void {
  if (message.channel.type !== ChannelType.GuildText) {
    return;
  }

  if (!message.member?.roles.cache.hasAny(...WHITELISTED_ROLES)) {
    return;
  }

  for (const prefix of [ '-list', '@' ]) {
    if (!message.content.startsWith(prefix)) {
      continue;
    }

    const roleIDs = message.content.split(prefix)[1]?.match(DISCORD_ID_REGEX);

    if (roleIDs && roleIDs.length === 0) {
      continue;
    }

    message.channel.send(roleIDs.map(id => `<@${id}>`).join(' '));
  }
}
