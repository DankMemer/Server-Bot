import { ModerationLog, ModerationLogType } from '@prisma/client';
import { EmbedBuilder } from 'discord.js';
import { CONFIG } from '../config';
import { discordClient } from '../lib/discord-client';
import { prismaClient } from '../lib/prisma-client';
import { upsertUsers } from './db';

export async function sendModerationLog(embed: EmbedBuilder): Promise<void> {
  const moderationLog = discordClient.bot.channels.resolve(CONFIG.ids.channels.dmc.modLogs);

  if (moderationLog.isTextBased()) {
    await moderationLog.send({ embeds: [ embed ] });
  }
}

export async function registerModerationLog(
  type: ModerationLogType,
  moderatorID: bigint,
  offenderID: bigint,
  guildID: bigint,
  reason: string,
  duration?: bigint | number,
): Promise<ModerationLog> {
  await upsertUsers([ moderatorID, offenderID ]);
  return await prismaClient.moderationLog.create({
    data: {
      moderatorID,
      offenderID,
      guildID,
      type,
      reason,
      duration,
    },
  });
}
