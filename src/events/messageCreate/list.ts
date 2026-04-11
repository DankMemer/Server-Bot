import { ChannelType, Message } from 'discord.js';
import { CONFIG } from '../../config';
import { prismaClient } from '../../lib/prisma-client';

const WHITELISTED_ROLES = [
  CONFIG.ids.roles.dmc.trialModerator,
  CONFIG.ids.roles.dmc.giveawayManager,
  CONFIG.ids.roles.dmc.moderator,
  CONFIG.ids.roles.dmo.moderator,
  CONFIG.ids.roles.dmc.serverManager,
  CONFIG.ids.roles.dmo.serverManager,
];
const DISCORD_ID_REGEX = /\d{17,19}/g;

export async function listHandler(message: Message): Promise<void> {
  if (message.channel.type !== ChannelType.GuildText) {
    return;
  }

  if (!message.member?.roles.cache.hasAny(...WHITELISTED_ROLES)) {
    return;
  }

  for (const prefix of ['-list', '@']) {
    if (!message.content.startsWith(prefix)) {
      continue;
    }

    const ids = message.content.split(prefix)[1]?.match(DISCORD_ID_REGEX);

    if (!ids || ids.length === 0) {
      continue;
    }

    const modlogs = await prismaClient.moderationLog.findMany({
      where: {
        offenderID: { in: ids.map(id => BigInt(id)) },
      },
      distinct: ['offenderID'],
      select: { offenderID: true },
    });

    const idsWithModlogs = new Set(modlogs.map(log => log.offenderID.toString()));

    await message.channel.send(
      ids.map(id => `• <@${id}>${idsWithModlogs.has(id) ? ' 💬' : ''}`).join('\n'),
    );
  }
}
