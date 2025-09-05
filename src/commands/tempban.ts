
import { ModerationLogType } from '@prisma/client';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import HolyTime from 'holy-time';
import { CONFIG } from '../config';
import { Colors } from '../constants/colors';
import { prismaClient } from '../lib/prisma-client';
import { Command, CommandContext } from '../structures/command';
import { canBanUser } from '../utils/moderation';
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
        .setName('reason')
        .setDescription('Ban reason')
        .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName('duration')
        .setDescription('Ban duration')
        .setRequired(true),
    );

  public override servers = [ CONFIG.ids.servers.dmc ];
  public override execute = async ({ interaction }: CommandContext): Promise<EmbedBuilder | string> => {
    const offender = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);
    const duration = interaction.options.getString('duration', true);

    const offenderMember = interaction.guild.members.resolve(offender.id);
    const moderatorMember = interaction.guild.members.resolve(interaction.user.id);

    if (!offenderMember) {
      return 'Could not find this member. They probably left.';
    }

    if (!moderatorMember) {
      return 'Could not find your member record.';
    }

    if (!canBanUser(moderatorMember, offenderMember)) {
      return new EmbedBuilder()
        .setDescription('You cannot ban this user.')
        .setColor(Colors.RED);
    }

    const milliseconds = parseDuration(duration);

    if (!milliseconds) {
      return 'You need to input a valid duration.';
    }

    try {
      await offenderMember.ban({
        reason: `Temporarily Banned by ${interaction.user.username} | ${reason} | ${duration}`,
      });
    } catch {
      return new EmbedBuilder()
        .setDescription('Could not tempban this member.')
        .setColor(Colors.RED);
    }

    const expires = HolyTime.in(milliseconds);

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

    const log = await registerModerationLog(
      ModerationLogType.TEMP_BAN,
      BigInt(interaction.user.id),
      BigInt(offender.id),
      BigInt(interaction.guildId),
      reason,
      milliseconds,
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

    interaction.reply({
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

