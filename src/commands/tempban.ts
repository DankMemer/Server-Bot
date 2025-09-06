
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
  public override execute = async ({ interaction }: CommandContext): Promise<EmbedBuilder | string | void> => {
    const offender = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);
    const duration = interaction.options.getString('duration', true);

    const offenderMember = interaction.guild.members.resolve(offender.id);
    const moderatorMember = interaction.guild.members.resolve(interaction.user.id);

    await interaction.deferReply({ ephemeral: true });

    if (!offenderMember) {
      const embed = new EmbedBuilder()
        .setDescription('Could not find this member. They probably left.')
        .setColor(Colors.RED);

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (!moderatorMember) {
      const embed = new EmbedBuilder()
        .setDescription('Could not find your member record.')
        .setColor(Colors.RED);

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (!canBanUser(moderatorMember, offenderMember)) {
      const embed = new EmbedBuilder()
        .setDescription('You cannot ban this user.')
        .setColor(Colors.RED);

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const milliseconds = parseDuration(duration);

    if (!milliseconds) {
      const embed = new EmbedBuilder()
        .setDescription('You need to input a valid duration.')
        .setColor(Colors.RED);

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    try {
      await offenderMember.ban({
        reason: `Temporarily Banned by ${interaction.user.username} | ${reason} | ${duration}`,
      });
    } catch {
      const embed = new EmbedBuilder()
        .setDescription('Could not tempban this member.')
        .setColor(Colors.RED);

      await interaction.editReply({ embeds: [embed] });
      return;
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

    await interaction.editReply({
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

