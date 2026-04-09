import { ModerationLogType } from '@prisma/client';
import HolyTime from 'holy-time';
import { prismaClient } from '../../../lib/prisma-client';
import { Widget } from '../../../lib/widgets';
import { Paginator, PaginatorContext, PaginatorOutput } from '../../../structures/paginator';
import { DiscordTimestampFormat, formatDiscordTimestamp } from '../../../utils/time';

function formatDeleteMessageSeconds(seconds: number): string {
  if (seconds % 86400 === 0) {
    const days = seconds / 86400;
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  }
  if (seconds % 3600 === 0) {
    const hours = seconds / 3600;
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  return `${seconds} seconds`;
}

const MODERATION_LOG_MAP: Record<ModerationLogType, string> = {
  [ModerationLogType.BAN]: '🔨 Ban',
  [ModerationLogType.KICK]: '👞 Kick',
  [ModerationLogType.TIME_OUT]: '🔇 Time Out',
  [ModerationLogType.UNBAN]: '🙏 Unban',
  [ModerationLogType.UNTIME_OUT]: '🔊 Untime Out',
  [ModerationLogType.TEMP_BAN]: '⏱️ Temp Ban',
  [ModerationLogType.SOFT_BAN]: '🧹 Soft Ban',
  [ModerationLogType.DECANCER]: '☣️ Decancer',
  [ModerationLogType.FREEZE_NICK]: '🧊 Freeze Nickname',
  [ModerationLogType.UNFREEZE_NICK]: '🌊 Unfreeze Nickname',
};

export class ModerationLogListPaginator extends Paginator {
  public override id = 'modlog-list';
  public override itemsPerPage = 5;
  public override filters = {
    BAN: 'Ban',
    KICK: 'Kick',
    TIME_OUT: 'Time Out',
    UNBAN: 'Unban',
    UNTIME_OUT: 'Untime Out',
    TEMP_BAN: 'Temp Ban',
    SOFT_BAN: 'Soft Ban',
    DECANCER: 'Decancer',
    FREEZE_NICK: 'Freeze Nickname',
    UNFREEZE_NICK: 'Unfreeze Nickname',
  };

  public async handle({ payload, interaction, filters }: PaginatorContext): Promise<PaginatorOutput> {
    let moderationLogs = await prismaClient.moderationLog.findMany({
      where: {
        offenderID: BigInt(payload),
        guildID: BigInt(interaction.guildId),
      },
      take: 200,
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (filters.length > 0) {
      moderationLogs = moderationLogs.filter(log => filters.includes(log.type));
    }

    return {
      delimiter: '\n\n',
      items: moderationLogs.map(log => {
        const hours = log.duration < HolyTime.Units.DAY;
        return `**${MODERATION_LOG_MAP[log.type]}**\n` +
        Widget.replyList([
          `ID: #${log.id}`,
          `Date: ${formatDiscordTimestamp(new HolyTime(log.createdAt), DiscordTimestampFormat.SHORT_DATE_TIME)} (${formatDiscordTimestamp(new HolyTime(log.createdAt), DiscordTimestampFormat.RELATIVE_TIME)})`,
          `Moderator: <@${log.moderatorID}>`,
          `Reason: ${log.reason}`,
          log.duration
            ? `Duration: ${HolyTime.duration(Number(log.duration)).in(hours ? 'hours' : 'days').toLocaleString()}${hours ? 'h' : 'd'}`
            : null,
          log.deleteMessageSeconds
            ? `Messages deleted: ${formatDeleteMessageSeconds(log.deleteMessageSeconds)}`
            : null,
        ]);
      }),
      payload,
      embed: {
        title: 'Moderation Log',
        description: `> <@${payload}> ${payload}\n\n`,
      },
    };
  }
}
