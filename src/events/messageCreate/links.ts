import { ChannelType, Message } from 'discord.js';
import { CONFIG } from '../../config';
import { getAllowedUrls } from '../../utils/allowed-urls';
import { extractUrlsFromMessage, isUrlAllowed } from '../../utils/url';

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

export async function linkHandler(message: Message): Promise<void> {
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

  const messageUrls = extractUrlsFromMessage(message.content);
  if (messageUrls.length === 0) {
    return;
  }

  try {
    const allowedUrls = await getAllowedUrls();

    const hasUnallowedUrls = messageUrls.some(url => !isUrlAllowed(url, allowedUrls));

    if (hasUnallowedUrls) {
      await message.delete();
    }
  } catch (error) {
    console.error('Error checking allowed URLs:', error);

    // On error, fall back to deleting the message (fail-safe approach)
    await message.delete();
  }
}
