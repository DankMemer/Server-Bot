import { ModerationLog, ModerationLogType } from '@prisma/client';
import { EmbedBuilder } from 'discord.js';
import { CONFIG } from '../config';
import { discordClient } from '../lib/discord-client';
import { prismaClient } from '../lib/prisma-client';
import { upsertUsers } from './db';

const MOD_LOG_CHANNEL_BY_GUILD: Record<string, string> = {
  [CONFIG.ids.servers.dmc]: CONFIG.ids.channels.dmc.modLogs,
  [CONFIG.ids.servers.dmo]: CONFIG.ids.channels.dmo.modLogs,
};

export async function sendModerationLog(embed: EmbedBuilder, guildID: string): Promise<void> {
  const channelID = MOD_LOG_CHANNEL_BY_GUILD[guildID];

  if (!channelID) {
    return;
  }

  const moderationLog = discordClient.bot.channels.resolve(channelID);

  if (moderationLog?.isTextBased()) {
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
  deleteMessageSeconds?: number,
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
      deleteMessageSeconds,
    },
  });
}
