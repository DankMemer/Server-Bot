import { ModerationLogType } from '@prisma/client';
import { EmbedBuilder, GuildMember } from 'discord.js';
import HolyTime from 'holy-time';
import { Colors } from '../../constants/colors';
import { discordClient } from '../../lib/discord-client';
import { logger } from '../../lib/logger';
import { memerClient, MemerUser } from '../../lib/memer-client';
import { registerModerationLog, sendModerationLog } from '../../utils/moderation-log';

export async function enforceNoNewAccounts(member: GuildMember): Promise<boolean> {
  if (!isMemberStillInGuild(member)) {
    return false;
  }

  if (HolyTime.since(member.user.createdAt) >= (HolyTime.Units.DAY * 10)) {
    return false;
  }

  const reason = 'Account younger than 10 days on join';

  try {
    await member.kick(reason);
    await logAutoKick(member, reason);
  } catch (error) {
    logger.error(`Failed to kick new account ${member.id}: ${error}`);
  }

  return true;
}

export async function enforceNoDankCommands(member: GuildMember, memerUser?: MemerUser | null): Promise<boolean> {
  if (!isMemberStillInGuild(member)) {
    return false;
  }

  const resolvedMemerUser = memerUser === undefined
    ? await memerClient.getUser(member.id)
    : memerUser;

  if (resolvedMemerUser?.commands !== 0) {
    return false;
  }

  const reason = 'Not a Dank Memer user';

  try {
    await member.kick(reason);
    await logAutoKick(member, reason);
  } catch (error) {
    logger.error(`Failed to kick non-Dank Memer user ${member.id}: ${error}`);
  }

  return true;
}

export async function enforceBan(member: GuildMember, memerUser?: MemerUser | null): Promise<boolean> {
  if (!isMemberStillInGuild(member)) {
    return false;
  }

  const resolvedMemerUser = memerUser === undefined
    ? await memerClient.getUser(member.id)
    : memerUser;

  if (!resolvedMemerUser?.banned?.is || HolyTime.between(HolyTime.now(), resolvedMemerUser.banned.until) <= HolyTime.Units.WEEK) {
    return false;
  }

  const reason = 'Banned from Dank Memer for longer than a week on join';

  try {
    await member.kick(reason);
    await logAutoKick(member, reason);
  } catch (error) {
    logger.error(`Failed to kick banned user ${member.id}: ${error}`);
  }

  return true;
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
    member.guild.id,
  );
}
