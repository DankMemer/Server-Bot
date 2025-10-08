import { ModerationLogType } from '@prisma/client';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { CONFIG } from '../config';
import { Colors } from '../constants/colors';
import { prismaClient } from '../lib/prisma-client';
import { Command, CommandContext } from '../structures/command';
import { canFreezeNickname } from '../utils/moderation';
import { registerModerationLog, sendModerationLog } from '../utils/moderation-log';

export class UnfreezeNickCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('unfreezenick')
    .setDescription('Unfreeze a user\'s nickname allowing them to change it')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User whose nickname to unfreeze')
        .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for unfreezing the nickname')
        .setRequired(true),
    );

  public override servers = [CONFIG.ids.servers.dmc];

  public override execute = async ({ interaction }: CommandContext): Promise<EmbedBuilder | string | void> => {
    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);

    const targetMember = interaction.guild.members.resolve(targetUser.id);
    const moderatorMember = interaction.guild.members.resolve(interaction.user.id);

    await interaction.deferReply({ ephemeral: true });

    if (!targetMember) {
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

    if (!canFreezeNickname(moderatorMember, targetMember)) {
      const embed = new EmbedBuilder()
        .setDescription('You cannot unfreeze this user\'s nickname.')
        .setColor(Colors.RED);

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Check if user has a frozen nickname
    const frozenNickname = await prismaClient.frozenNickname.findUnique({
      where: {
        userID: BigInt(targetUser.id),
      },
    });

    if (!frozenNickname) {
      const embed = new EmbedBuilder()
        .setDescription('This user does not have a frozen nickname.')
        .setColor(Colors.YELLOW);

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    await prismaClient.frozenNickname.delete({
      where: {
        userID: BigInt(targetUser.id),
      },
    });

    const log = await registerModerationLog(
      ModerationLogType.UNFREEZE_NICK,
      BigInt(interaction.user.id),
      BigInt(targetUser.id),
      BigInt(interaction.guildId),
      reason,
    );

    await sendModerationLog(
      new EmbedBuilder()
        .setTitle('🌊 Nickname Unfrozen')
        .setDescription(
          `**User:** ${targetUser.username} <@${targetUser.id}>\n` +
          `**Previously Frozen As:** ${frozenNickname.frozenNickname}\n` +
          `**Reason:** ${reason}\n` +
          `**Moderator:** ${interaction.user.username} <@${interaction.user.id}>`,
        )
        .setFooter({ text: `ID: ${targetUser.id} | #${log.id}` })
        .setTimestamp()
        .setColor(Colors.GREEN),
    );

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: `${targetUser.username}'s nickname has been unfrozen`,
            iconURL: targetUser.avatarURL(),
          })
          .setColor(Colors.INVISIBLE)
          .addFields(
            {
              name: 'Previously Frozen As',
              value: frozenNickname.frozenNickname,
              inline: true,
            },
            {
              name: 'Current Nickname',
              value: targetMember.displayName,
              inline: true,
            },
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
