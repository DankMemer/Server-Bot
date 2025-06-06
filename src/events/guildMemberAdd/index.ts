import { EmbedBuilder, GuildMember } from 'discord.js';
import HolyTime from 'holy-time';
import { ModerationLogType } from '@prisma/client';
import { memerClient } from '../../lib/memer-client';
import { registerModerationLog, sendModerationLog } from '../../utils/moderation-log';
import { discordClient } from '../../lib/discord-client';
import { Colors } from '../../constants/colors';
import { CONFIG } from '../../config';

export default async function guildMemberAdd(member: GuildMember): Promise<void> {
  let reason: string;

  if (HolyTime.since(member.user.createdAt) < (HolyTime.Units.DAY * 3)) {
    reason = 'Account younger than 3 days on join';
  }

  if (!reason) {
    const memerUser = await memerClient.getUser(member.id);

    if (memerUser?.banned?.is && HolyTime.between(HolyTime.now(), memerUser.banned.until) > HolyTime.Units.WEEK) {
      reason = 'Banned from Dank Memer for longer than a week on join';
    }
  }

  if (!reason) {
    return;
  }

  try {
    await member.kick(reason);

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
  } catch {}
}
