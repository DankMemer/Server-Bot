import { ModerationLogType } from '@prisma/client';
import { AuditLogEvent, EmbedBuilder, Guild, GuildAuditLogsEntry, User } from 'discord.js';
import { CONFIG } from '../../config';
import { Colors } from '../../constants/colors';
import { discordClient } from '../../lib/discord-client';
import { ModerationActionType, consumeActionInFlight } from '../../utils/moderation-action-cache';
import { registerModerationLog, sendModerationLog } from '../../utils/moderation-log';

type ActionConfig = {
  logType: ModerationLogType;
  dedupeType: ModerationActionType;
  title: string;
  color: number;
};

const ACTION_MAP: Partial<Record<AuditLogEvent, ActionConfig>> = {
  [AuditLogEvent.MemberBanAdd]: {
    logType: ModerationLogType.BAN,
    dedupeType: 'BAN',
    title: '🔨 Ban (Manual)',
    color: Colors.RED,
  },
  [AuditLogEvent.MemberBanRemove]: {
    logType: ModerationLogType.UNBAN,
    dedupeType: 'UNBAN',
    title: '🙏 Unban (Manual)',
    color: Colors.GREEN,
  },
  [AuditLogEvent.MemberKick]: {
    logType: ModerationLogType.KICK,
    dedupeType: 'KICK',
    title: '👞 Kick (Manual)',
    color: Colors.ORANGE,
  },
};

export default async function guildAuditLogEntryCreate(entry: GuildAuditLogsEntry, guild: Guild): Promise<void> {
  const config = ACTION_MAP[entry.action];

  if (!config) {
    return;
  }

  const targetId = entry.targetId;

  if (!targetId) {
    return;
  }

  if (consumeActionInFlight(guild.id, targetId, config.dedupeType)) {
    return;
  }

  if (entry.executorId && entry.executorId === discordClient.bot.user.id) {
    return;
  }

  const moderatorID = BigInt(entry.executorId ?? discordClient.bot.user.id);
  const reason = entry.reason ?? 'No reason provided';

  const targetUser = entry.target instanceof User
    ? entry.target
    : await discordClient.bot.users.fetch(targetId).catch(() => null);

  const log = await registerModerationLog(
    config.logType,
    moderatorID,
    BigInt(targetId),
    BigInt(guild.id),
    reason,
  );

  if (guild.id !== CONFIG.ids.servers.dmc) {
    return;
  }

  const moderator = entry.executor ?? (entry.executorId
    ? await discordClient.bot.users.fetch(entry.executorId).catch(() => null)
    : null);

  const offenderName = targetUser?.username ?? targetId;
  const moderatorName = moderator?.username ?? discordClient.bot.user.username;
  const moderatorMention = moderator
    ? `<@${moderator.id}>`
    : `<@${discordClient.bot.user.id}>`;

  await sendModerationLog(
    new EmbedBuilder()
      .setTitle(config.title)
      .setDescription(
        `**Offender:** ${offenderName} <@${targetId}>\n` +
        `**Reason:** ${reason}\n` +
        `**Moderator:** ${moderatorName} ${moderatorMention}`,
      )
      .setFooter({ text: `ID: ${targetId} | #${log.id}` })
      .setTimestamp()
      .setColor(config.color),
  );
}
