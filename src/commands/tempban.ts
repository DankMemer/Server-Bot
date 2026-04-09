
import { ModerationLogType } from '@prisma/client';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import HolyTime from 'holy-time';
import { CONFIG } from '../config';
import { Colors } from '../constants/colors';
import { prismaClient } from '../lib/prisma-client';
import { Command, CommandContext } from '../structures/command';
import { canBanNonMember, canBanUser } from '../utils/moderation';
import { markActionInFlight } from '../utils/moderation-action-cache';
import { registerModerationLog, sendModerationLog } from '../utils/moderation-log';
import { DiscordTimestampFormat, formatDiscordTimestamp, parseDuration } from '../utils/time';

export class TemporaryBanCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('tempban')
    .setDescription('Temporarily ban a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to ban')
        .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName('duration')
        .setDescription('Ban duration')
        .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Ban reason')
        .setRequired(true),
    )
    .addStringOption(
      option =>
        option
          .setName('delete_messages')
          .setDescription('Delete messages')
          .addChoices(
            { name: '1 day', value: HolyTime.Units.DAY.toString() },
            { name: '3 days', value: (HolyTime.Units.DAY * 3).toString() },
            { name: '7 days', value: (HolyTime.Units.DAY * 7).toString() },
          )
          .setRequired(false),
    );

  public override servers = [ CONFIG.ids.servers.dmc ];
  public override execute = async ({ interaction }: CommandContext): Promise<EmbedBuilder | string | void> => {
    const offender = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);
    const duration = interaction.options.getString('duration', true);
    const deleteMessageSeconds = interaction.options.getString('delete_messages', false);

    const offenderMember = interaction.guild.members.resolve(offender.id);
    const moderatorMember = interaction.guild.members.resolve(interaction.user.id);

    if (!moderatorMember) {
      return new EmbedBuilder()
        .setDescription('Could not find your member record.')
        .setColor(Colors.RED);
    }

    if (offenderMember) {
      if (!canBanUser(moderatorMember, offenderMember)) {
        return new EmbedBuilder()
          .setDescription('You cannot ban this user.')
          .setColor(Colors.RED);
      }
    } else if (!canBanNonMember(moderatorMember)) {
      return new EmbedBuilder()
        .setDescription('You cannot ban this user.')
        .setColor(Colors.RED);
    }

    const milliseconds = parseDuration(duration);

    if (!milliseconds) {
      return 'You need to input a valid duration.';
    }

    const expires = HolyTime.in(milliseconds);

    if (offenderMember) {
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
              )
              .addFields(
                {
                  name: 'Expires',
                  value: `${formatDiscordTimestamp(expires, DiscordTimestampFormat.SHORT_DATE_TIME)} (${formatDiscordTimestamp(expires, DiscordTimestampFormat.RELATIVE_TIME)})`,
                  inline: false,
                },
              )
              .setAuthor({
                name: `You've been temporarily banned in ${interaction.guild.name}`,
                iconURL: interaction.guild.iconURL(),
              })
              .setColor(Colors.INVISIBLE),
          ],
        })
        .catch(() => null);
    }

    const deleteMessageSecondsValue = deleteMessageSeconds
      ? Number.parseInt(deleteMessageSeconds) / HolyTime.Units.SECOND
      : null;

    try {
      markActionInFlight(interaction.guildId, offender.id, 'BAN');
      await interaction.guild.members.ban(offender, {
        reason: `Temporarily Banned by ${interaction.user.username} | ${reason} | ${duration}`,
        ...(deleteMessageSecondsValue ? { deleteMessageSeconds: deleteMessageSecondsValue } : {}),
      });
    } catch {
      return new EmbedBuilder()
        .setDescription('Could not tempban this member.')
        .setColor(Colors.RED);
    }

    const log = await registerModerationLog(
      ModerationLogType.TEMP_BAN,
      BigInt(interaction.user.id),
      BigInt(offender.id),
      BigInt(interaction.guildId),
      reason,
      milliseconds,
      deleteMessageSecondsValue ?? undefined,
    );

    await prismaClient.tempBan.create({
      data: {
        userID: BigInt(offender.id),
        guildID: BigInt(interaction.guildId),
        expiresAt: expires.getDate(),
      },
    });

    await sendModerationLog(
      new EmbedBuilder()
        .setTitle('⏱️ Temporary Ban')
        .setDescription(
          `**Offender:** ${offender.username} <@${offender.id}>\n` +
          `**Reason:** ${reason}\n` +
          `**Moderator:** ${interaction.user.username} <@${interaction.user.id}>\n` +
          `**Ends:** ${formatDiscordTimestamp(expires, DiscordTimestampFormat.SHORT_DATE_TIME)} (${formatDiscordTimestamp(expires, DiscordTimestampFormat.RELATIVE_TIME)})`,
        )
        .setFooter({ text: `ID: ${offender.id} | #${log.id}` })
        .setTimestamp()
        .setColor(Colors.RED),
    );

    await interaction.reply({
      ephemeral: true,
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: `${offender.username} has been temporarily banned`,
            iconURL: offender.avatarURL(),
          })
          .setColor(Colors.INVISIBLE)
          .addFields(
            {
              name: 'Reason',
              value: reason,
              inline: false,
            },
          )
          .addFields(
            {
              name: 'Expires',
              value: `${formatDiscordTimestamp(expires, DiscordTimestampFormat.SHORT_DATE_TIME)} (${formatDiscordTimestamp(expires, DiscordTimestampFormat.RELATIVE_TIME)})`,
              inline: false,
            },
          ),
      ],
    });
  };
}

