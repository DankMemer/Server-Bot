import { ModerationLogType } from '@prisma/client';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
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
          .setName('delete_messages')
          .setDescription('Delete messages (days)')
          .addChoices(
            { name: '1 day', value: '1' },
            { name: '3 days', value: '3' },
            { name: '7 days', value: '7' },
          )
          .setRequired(false),
    );

  public override servers = [CONFIG.ids.servers.dmc];

  public override execute = async ({ interaction }: CommandContext): Promise<EmbedBuilder | string | void> => {
    await interaction.deferReply({ ephemeral: true });

    const offender = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);
    const deleteMessageDaysOption = interaction.options.getString('delete_messages', false);

    const offenderMember = interaction.guild.members.resolve(offender.id);
    const moderatorMember = interaction.guild.members.resolve(interaction.user.id);

    const days = deleteMessageDaysOption ? Number.parseInt(deleteMessageDaysOption, 10) : 1;

    if (!offenderMember) {
      return new EmbedBuilder()
        .setDescription('Could not find this member. They probably left.')
        .setColor(Colors.RED);
    }

    if (!moderatorMember) {
      return new EmbedBuilder()
        .setDescription('Could not find your member record.')
        .setColor(Colors.RED);
    }

    if (!canBanUser(moderatorMember, offenderMember)) {
      return new EmbedBuilder()
        .setDescription('You cannot softban this user.')
        .setColor(Colors.RED);
    }

    try {
      await interaction.guild.members.ban(offender, {
        reason: `Softbanned by ${interaction.user.username} | ${reason}`,
        ...(deleteMessageDaysOption ? { deleteMessageDays: days } : {}),
      });

      await interaction.guild.members.unban(
        offender.id,
        `Softban unban by ${interaction.user.username} | ${reason}`
      );
    } catch (error) {
      return new EmbedBuilder()
        .setDescription('Could not softban this member. Make sure I have the necessary permissions.')
        .setColor(Colors.RED);
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
