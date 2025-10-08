import { ModerationLogType } from '@prisma/client';
import { EmbedBuilder, GuildMember } from 'discord.js';
import HolyTime from 'holy-time';
import { CONFIG } from '../../config';
import { Colors } from '../../constants/colors';
import { discordClient } from '../../lib/discord-client';
import { logger } from '../../lib/logger';
import { memerClient } from '../../lib/memer-client';
import { registerModerationLog, sendModerationLog } from '../../utils/moderation-log';

export async function enforceNoNewAccounts(member: GuildMember): Promise<void> {
  if (!isMemberStillInGuild(member)) {
    return;
  }

  if (HolyTime.since(member.user.createdAt) >= (HolyTime.Units.DAY * 3)) {
    return;
  }

  const reason = 'Account younger than 3 days on join';

  try {
    await member.kick(reason);
    await logAutoKick(member, reason);
  } catch (error) {
    logger.error(`Failed to kick new account ${member.id}: ${error}`);
  }
}

export async function enforceBan(member: GuildMember): Promise<void> {
  if (!isMemberStillInGuild(member)) {
    return;
  }

  const memerUser = await memerClient.getUser(member.id);

  if (!memerUser?.banned?.is || HolyTime.between(HolyTime.now(), memerUser.banned.until) <= HolyTime.Units.WEEK) {
    return;
  }

  const reason = 'Banned from Dank Memer for longer than a week on join';

  try {
    await member.kick(reason);
    await logAutoKick(member, reason);
  } catch (error) {
    logger.error(`Failed to kick banned user ${member.id}: ${error}`);
  }
}

function isMemberStillInGuild(member: GuildMember): boolean {
  return member.guild.members.cache.has(member.id);
}

async function logAutoKick(member: GuildMember, reason: string): Promise<void> {
  const log = await registerModerationLog(
    ModerationLogType.KICK,
    BigInt(discordClient.bot.user.id),
    BigInt(member.id),
    BigInt(member.guild.id),
    reason,
  );

  if (member.guild.id !== CONFIG.ids.servers.dmc) {
    return;
  }

  await sendModerationLog(
    new EmbedBuilder()
      .setTitle('👞 Kick')
      .setDescription(
        `**Offender:** ${member.user.username} <@${member.id}>\n` +
        `**Reason:** ${reason}\n` +
        `**Moderator:** ${discordClient.bot.user.username} <@${discordClient.bot.user.id}>`,
      )
      .setFooter({ text: `ID: ${member.id} | #${log.id}` })
      .setTimestamp()
      .setColor(Colors.ORANGE),
  );
}
