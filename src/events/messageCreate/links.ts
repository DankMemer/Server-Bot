import { ChannelType, Message } from 'discord.js';
import { CONFIG } from '../../config';

const WHITELISTED_ROLES = [
  CONFIG.ids.roles.dmc.giveawayManager,
  CONFIG.ids.roles.dmc.supportModerator,
  CONFIG.ids.roles.dmc.trialModerator,
  CONFIG.ids.roles.dmc.moderator,
  CONFIG.ids.roles.dmc.team,
];
const WHITELISTED_CHANNELS = new Set<string>([
  CONFIG.ids.channels.dmc.premium,
  CONFIG.ids.channels.dmc.premiumSupport,
]);
const WHITELISTED_LINKS = [
  'dankmemer.lol',
];

const URL_REGEX = /https?:\/\/(?:www\.)?[\w#%+.:=@~-]{1,256}\.[\d()A-Za-z]{1,6}\b[\w#%&()+./:=?@~-]*/g;

export function linkHandler(message: Message): void {
  if (message.guild?.id !== CONFIG.ids.servers.dmc) {
    return;
  }

  if (message.channel.type !== ChannelType.GuildText) {
    return;
  }

  if (message.author.bot) {
    return;
  }

  if (message.member?.roles.cache.hasAny(...WHITELISTED_ROLES) || WHITELISTED_CHANNELS.has(message.channel.id)) {
    return;
  }

  const links = message.content.match(URL_REGEX);

  if (!links || links.every(link => WHITELISTED_LINKS.some(wl => link.startsWith(`https://${wl}`) || link.startsWith(`http://${wl}`)))) {
    return;
  }

  message.delete();
}
