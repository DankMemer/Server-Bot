
import { ModerationLogType } from '@prisma/client';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import HolyTime from 'holy-time';
import { CONFIG } from '../config';
import { Colors } from '../constants/colors';
import { Command, CommandContext } from '../structures/command';
import { canTimeoutUser } from '../utils/moderation';
import { registerModerationLog, sendModerationLog } from '../utils/moderation-log';
import { DiscordTimestampFormat, formatDiscordTimestamp, parseDuration } from '../utils/time';

export class SupportCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to timeout')
        .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName('duration')
        .setDescription('Timeout duration')
        .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Timeout reason')
        .setRequired(true),
    );
  public override servers = [ CONFIG.ids.servers.dmc ];
  public override execute = async ({ interaction }: CommandContext): Promise<EmbedBuilder | string | void> => {
    const offender = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);
    const duration = interaction.options.getString('duration', true);

    const offenderMember = interaction.guild.members.resolve(offender.id);
    const moderatorMember = interaction.guild.members.resolve(interaction.user.id);

    if (!offenderMember) {
      return 'Could not find this member. They probably left.';
    }

    if (!moderatorMember) {
      return new EmbedBuilder()
        .setDescription('Could not find your member record.')
        .setColor(Colors.RED);
    }

    if (!canTimeoutUser(moderatorMember, offenderMember)) {
      return new EmbedBuilder()
        .setDescription('You cannot timeout this user.')
        .setColor(Colors.RED);
    }

    const milliseconds = parseDuration(duration);

    if (!milliseconds) {
      return 'You need to input a valid duration.';
    }

    try {
      await offenderMember.timeout(milliseconds, reason);
    } catch {
      return new EmbedBuilder()
        .setDescription('Could not timeout this member.')
        .setColor(Colors.RED);
    }

    const ends = formatDiscordTimestamp(HolyTime.in(milliseconds), DiscordTimestampFormat.RELATIVE_TIME);

    await offender
      .send({
        embeds: [
          new EmbedBuilder()
            .addFields(
              {
                name: 'Reason',
                value: reason,
                inline: false,
              },
              {
                name: 'Ends',
                value: ends,
                inline: false,
              },
            )
            .setAuthor({
              name: `You've been timed out in ${interaction.guild.name}`,
              iconURL: interaction.guild.iconURL(),
            })
            .setColor(Colors.INVISIBLE),
        ],
      })
      .catch(() => null);

    const log = await registerModerationLog(
      ModerationLogType.TIME_OUT,
      BigInt(interaction.user.id),
      BigInt(offender.id),
      BigInt(interaction.guildId),
      reason,
      milliseconds,
    );

    await sendModerationLog(
      new EmbedBuilder()
        .setTitle('🔇 Time Out')
        .setDescription(
          `**Offender:** ${offender.username} <@${offender.id}>\n` +
          `**Reason:** ${reason}\n` +
          `**Moderator:** ${interaction.user.username} <@${interaction.user.id}>\n` +
          `**Ends:** ${formatDiscordTimestamp(HolyTime.in(milliseconds), DiscordTimestampFormat.SHORT_TIME)} (${ends})`,
        )
        .setFooter({ text: `ID: ${offender.id} | #${log.id}` })
        .setTimestamp()
        .setColor(Colors.BLUE),
    );

    await interaction.reply({
      ephemeral: true,
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: `${offender.username} has been timed out`,
            iconURL: offender.avatarURL(),
          })
          .setColor(Colors.INVISIBLE)
          .addFields(
            {
              name: 'Reason',
              value: reason,
              inline: false,
            },
            {
              name: 'Ends',
              value: ends,
              inline: false,
            },
          ),
      ],
    });
  };
}

