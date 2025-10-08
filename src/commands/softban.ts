import { ModerationLogType } from '@prisma/client';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import HolyTime from 'holy-time';
import { CONFIG } from '../config';
import { Colors } from '../constants/colors';
import { Command, CommandContext } from '../structures/command';
import { canBanUser } from '../utils/moderation';
import { registerModerationLog, sendModerationLog } from '../utils/moderation-log';

export class SoftbanCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Ban and unban a user to delete their recent messages')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to softban')
        .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Softban reason')
        .setRequired(true),
    )
    .addStringOption(
      option =>
        option
          .setName('days')
          .setDescription('Days of messages to delete')
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
    const days = interaction.options.getInteger('days', false) ?? 1;

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
        .setDescription('You cannot softban this user.')
        .setColor(Colors.RED);

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const deleteMessageSeconds = days * HolyTime.Units.DAY / HolyTime.Units.SECOND;

    try {
      await interaction.guild.members.ban(offender, {
        reason: `Softbanned by ${interaction.user.username} | ${reason}`,
        deleteMessageSeconds: deleteMessageSeconds,
      });

      await interaction.guild.members.unban(
        offender.id,
        `Softban unban by ${interaction.user.username} | ${reason}`
      );
    } catch (error) {
      const embed = new EmbedBuilder()
        .setDescription('Could not softban this member. Make sure I have the necessary permissions.')
        .setColor(Colors.RED);

      await interaction.editReply({ embeds: [embed] });
      return;
    }

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
                name: 'Days of messages deleted',
                value: days.toString(),
                inline: false,
              },
            )
            .setAuthor({
              name: `You've been softbanned in ${interaction.guild.name}`,
              iconURL: interaction.guild.iconURL(),
            })
            .setDescription('A softban removes your recent messages but allows you to rejoin the server immediately.')
            .setColor(Colors.ORANGE),
        ],
      })
      .catch(() => null);

    const log = await registerModerationLog(
      ModerationLogType.SOFT_BAN,
      BigInt(interaction.user.id),
      BigInt(offenderMember.id),
      BigInt(interaction.guildId),
      reason,
    );

    await sendModerationLog(
      new EmbedBuilder()
        .setTitle('🧹 Soft Ban')
        .setDescription(
          `**Offender:** ${offenderMember.user.username} <@${offenderMember.id}>\n` +
          `**Reason:** ${reason}\n` +
          `**Moderator:** ${interaction.user.username} <@${interaction.user.id}>\n` +
          `**Days deleted:** ${days}`,
        )
        .setFooter({ text: `ID: ${offenderMember.id} | #${log.id}` })
        .setTimestamp()
        .setColor(Colors.ORANGE),
    );

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: `${offenderMember.user.username} has been softbanned`,
            iconURL: offenderMember.user.avatarURL(),
          })
          .setColor(Colors.INVISIBLE)
          .addFields(
            {
              name: 'Reason',
              value: reason,
              inline: false,
            },
            {
              name: 'Days of messages deleted',
              value: days.toString(),
              inline: false,
            },
          ),
      ],
    });
  };
}
