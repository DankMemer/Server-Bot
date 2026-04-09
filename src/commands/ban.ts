import { ModerationLogType } from '@prisma/client';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import HolyTime from 'holy-time';
import { CONFIG } from '../config';
import { Colors } from '../constants/colors';
import { Command, CommandContext } from '../structures/command';
import { canBanNonMember, canBanUser } from '../utils/moderation';
import { markActionInFlight } from '../utils/moderation-action-cache';
import { registerModerationLog, sendModerationLog } from '../utils/moderation-log';

export class BanCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user')
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
  public override servers = [CONFIG.ids.servers.dmc];
  public override execute = async ({ interaction }: CommandContext): Promise<EmbedBuilder | void> => {
    const offender = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);
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
              .setAuthor({
                name: `You've been banned in ${interaction.guild.name}`,
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
        reason: `Banned by ${interaction.user.username} | ${reason}`,
        ...(deleteMessageSecondsValue ? { deleteMessageSeconds: deleteMessageSecondsValue } : {}),
      });
    } catch {
      return new EmbedBuilder()
        .setDescription('Could not ban this member.')
        .setColor(Colors.RED);
    }

    const log = await registerModerationLog(
      ModerationLogType.BAN,
      BigInt(interaction.user.id),
      BigInt(offender.id),
      BigInt(interaction.guildId),
      reason,
      undefined,
      deleteMessageSecondsValue ?? undefined,
    );

    await sendModerationLog(
      new EmbedBuilder()
        .setTitle('🔨 Ban')
        .setDescription(
          `**Offender:** ${offender.username} <@${offender.id}>\n` +
          `**Reason:** ${reason}\n` +
          `**Moderator:** ${interaction.user.username} <@${interaction.user.id}>`,
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
            name: `${offender.username} has been banned`,
            iconURL: offender.avatarURL(),
          })
          .setColor(Colors.INVISIBLE)
          .addFields(
            {
              name: 'Reason',
              value: reason,
              inline: false,
            },
          ),
      ],
    });
  };
}

