import { EmbedBuilder, GuildMember } from 'discord.js';
import HolyTime from 'holy-time';
import { CONFIG } from '../config';
import { Colors } from '../constants/colors';
import { discordClient } from '../lib/discord-client';
import { logger } from '../lib/logger';
import { MemerUser } from '../lib/memer-client';

const MEMBER_LOG_CHANNEL_BY_GUILD: Record<string, string | null> = {
  [CONFIG.ids.servers.dmc]: CONFIG.ids.channels.dmc.joinLeaveLogs,
};

export async function sendMemberJoinLog(member: GuildMember, memerUser: MemerUser | null): Promise<void> {
  const embed = new EmbedBuilder()
    .setAuthor({
      name: member.user.username,
      iconURL: member.user.displayAvatarURL(),
    })
    .setTitle('Member joined')
    .setDescription(
      `${member} ${formatOrdinal(member.guild.memberCount)} to join\n` +
      `created (${formatElapsedTime(HolyTime.since(member.user.createdAt))} ago)\n` +
      `Dank Commands: ${formatDankCommandCount(memerUser)}`,
    )
    .setFooter({ text: `ID: ${member.id}` })
    .setTimestamp()
    .setColor(Colors.GREEN);

  await sendMemberLog(embed, member.guild.id);
}

export async function sendMemberLeaveLog(member: GuildMember): Promise<void> {
  const embed = new EmbedBuilder()
    .setAuthor({
      name: member.user.username,
      iconURL: member.user.displayAvatarURL(),
    })
    .setTitle('Member left')
    .setDescription(
      `${member} ${formatJoinedAt(member)}\n` +
      `**Roles:** ${formatRoles(member)}`,
    )
    .setFooter({ text: `ID: ${member.id}` })
    .setTimestamp()
    .setColor(Colors.YELLOW);

  await sendMemberLog(embed, member.guild.id);
}

async function sendMemberLog(embed: EmbedBuilder, guildID: string): Promise<void> {
  const channelID = MEMBER_LOG_CHANNEL_BY_GUILD[guildID];

  if (!channelID) {
    return;
  }

  const memberLog = discordClient.bot.channels.resolve(channelID);

  if (!memberLog?.isTextBased()) {
    return;
  }

  try {
    await memberLog.send({ embeds: [ embed ] });
  } catch (error) {
    logger.error(`Failed to send member log to ${channelID}: ${error}`);
  }
}

function formatDankCommandCount(memerUser: MemerUser | null): string {
  return (memerUser?.commands ?? 0).toLocaleString();
}

function formatJoinedAt(member: GuildMember): string {
  if (!member.joinedAt) {
    return 'joined at an unknown time';
  }

  return `joined ${formatElapsedTime(HolyTime.since(member.joinedAt))} ago`;
}

function formatRoles(member: GuildMember): string {
  const roles = [ ...member.roles.cache.values() ]
    .filter(role => role.id !== member.guild.id)
    .sort((a, b) => b.position - a.position)
    .map(role => `${role}`);

  return roles.length > 0 ? roles.join(' ') : 'None';
}

function formatOrdinal(value: number): string {
  const remainder = value % 100;

  if (remainder >= 11 && remainder <= 13) {
    return `${value.toLocaleString()}th`;
  }

  switch (value % 10) {
    case 1:
      return `${value.toLocaleString()}st`;
    case 2:
      return `${value.toLocaleString()}nd`;
    case 3:
      return `${value.toLocaleString()}rd`;
    default:
      return `${value.toLocaleString()}th`;
  }
}

function formatElapsedTime(milliseconds: number): string {
  const units = [
    [ 'year', HolyTime.Units.YEAR ],
    [ 'month', HolyTime.Units.MONTH ],
    [ 'week', HolyTime.Units.WEEK ],
    [ 'day', HolyTime.Units.DAY ],
    [ 'hour', HolyTime.Units.HOUR ],
    [ 'minute', HolyTime.Units.MINUTE ],
    [ 'second', HolyTime.Units.SECOND ],
  ] as const;

  const parts: string[] = [];
  let remaining = Math.max(0, milliseconds);

  for (const [ label, unit ] of units) {
    const amount = Math.floor(remaining / unit);

    if (amount === 0) {
      continue;
    }

    parts.push(`${amount} ${label}${amount === 1 ? '' : 's'}`);
    remaining -= amount * unit;

    if (parts.length === 3) {
      break;
    }
  }

  if (parts.length === 0) {
    return '0 seconds';
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
}
