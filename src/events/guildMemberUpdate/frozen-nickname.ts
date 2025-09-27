import { FrozenNickname, ModerationLogType } from '@prisma/client';
import { EmbedBuilder, GuildMember } from 'discord.js';
import { CONFIG } from '../../config';
import { Colors } from '../../constants/colors';
import { discordClient } from '../../lib/discord-client';
import { logger } from '../../lib/logger';
import { prismaClient } from '../../lib/prisma-client';
import { isUserOnDmCooldown, setUserDmCooldown } from '../../utils/dm-cooldown';
import { registerModerationLog, sendModerationLog } from '../../utils/moderation-log';

export async function enforceFrozenNickname(member: GuildMember): Promise<void> {
  if (!isMemberStillInGuild(member)) {
    return;
  }

  const frozenNickname = await fetchFrozenNickname(member.id);
  if (!frozenNickname) {
    return;
  }

  if (member.nickname === frozenNickname.frozenNickname) {
    return;
  }

  try {
    await revertMemberNickname(member, frozenNickname);
    await notifyMemberNicknameReverted(member, frozenNickname);
    await logNicknameReverted(member, frozenNickname);
  } catch (error) {
    logger.error(`Failed to revert frozen nickname for user ${member.id}: ${error}`);
  }
}

function isMemberStillInGuild(member: GuildMember): boolean {
  return member.guild.members.cache.has(member.id);
}

async function fetchFrozenNickname(userId: string): Promise<FrozenNickname | null> {
  return await prismaClient.frozenNickname.findUnique({
    where: {
      userID: BigInt(userId),
    },
  });
}

async function revertMemberNickname(member: GuildMember, frozenNickname: FrozenNickname): Promise<void> {
  await member.setNickname(frozenNickname.frozenNickname, 'Reverting to frozen nickname');
}

async function notifyMemberNicknameReverted(member: GuildMember, frozenNickname: FrozenNickname) {
  if (await isUserOnDmCooldown(member.id)) {
    return;
  }

  await setUserDmCooldown(member.id);

  await member.user.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('Nickname Change Reverted')
        .setDescription(
          `Your nickname in **${member.guild.name}** has been frozen as **${frozenNickname.frozenNickname}**.\n\n` +
          `Your nickname was automatically reverted because it is currently frozen by a moderator.\n\n` +
          `**Reason:** ${frozenNickname.reason}\n\n` +
          `If you believe this is an error, please contact a moderator.`
        )
        .setColor(Colors.BLUE)
        .setTimestamp(),
    ],
  }).catch(() => {
    // Ignore DM failures (user has DMs disabled, etc.)
  });
}

async function logNicknameReverted(member: GuildMember, frozenNickname: FrozenNickname): Promise<void> {
  const log = await registerModerationLog(
    ModerationLogType.FREEZE_NICK,
    BigInt(discordClient.bot.user.id),
    BigInt(member.id),
    BigInt(member.guild.id),
    `Enforced frozen nickname: ${frozenNickname.reason}`,
  );

  const originalNickname = member.displayName;

  if (member.guild.id !== CONFIG.ids.servers.dmc) {
    return;
  }

  await sendModerationLog(
    new EmbedBuilder()
      .setTitle('🧊 Frozen Nickname Enforced')
      .setDescription(
        `**User:** ${member.user.username} <@${member.id}>\n` +
        `**Original Nickname:** ${originalNickname}\n` +
        `**Enforced Nickname:** ${frozenNickname.frozenNickname}\n` +
        `**Reason:** ${frozenNickname.reason}\n` +
        `**Moderator:** ${discordClient.bot.user.username} <@${discordClient.bot.user.id}>`,
      )
      .setFooter({ text: `ID: ${member.id} | #${log.id}` })
      .setTimestamp()
      .setColor(Colors.BLUE),
  );
}
