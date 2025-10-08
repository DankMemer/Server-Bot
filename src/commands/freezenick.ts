import { ModerationLogType } from '@prisma/client';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { CONFIG } from '../config';
import { Colors } from '../constants/colors';
import { prismaClient } from '../lib/prisma-client';
import { Command, CommandContext } from '../structures/command';
import { canFreezeNickname } from '../utils/moderation';
import { registerModerationLog, sendModerationLog } from '../utils/moderation-log';

export class FreezeNickCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('freezenick')
    .setDescription('Freeze a user\'s nickname so they cannot change it')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User whose nickname to freeze')
        .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName('nickname')
        .setDescription('The nickname to freeze them as')
        .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for freezing the nickname')
        .setRequired(true),
    );

  public override servers = [CONFIG.ids.servers.dmc];

  public override execute = async ({ interaction }: CommandContext): Promise<EmbedBuilder | string | void> => {
    const targetUser = interaction.options.getUser('user', true);
    const frozenNickname = interaction.options.getString('nickname', true);
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
        .setDescription('You cannot freeze this user\'s nickname.')
        .setColor(Colors.RED);

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (frozenNickname.length > 32) {
      const embed = new EmbedBuilder()
        .setDescription('Nickname cannot be longer than 32 characters.')
        .setColor(Colors.RED);

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const existingFreeze = await prismaClient.frozenNickname.findUnique({
      where: {
        userID: BigInt(targetUser.id),
      },
    });

    if (existingFreeze) {
      const embed = new EmbedBuilder()
        .setDescription('That user\'s nickname is already frozen.')
        .setColor(Colors.RED);

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const originalNickname = targetMember.displayName;

    try {
      await targetMember.setNickname(frozenNickname, `Nickname frozen by ${interaction.user.username} | ${reason}`);
    } catch {
      const embed = new EmbedBuilder()
        .setDescription('Could not change this user\'s nickname. Check bot permissions.')
        .setColor(Colors.RED);

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    await prismaClient.frozenNickname.create({
      data: {
        userID: BigInt(targetUser.id),
        moderatorID: BigInt(interaction.user.id),
        guildID: BigInt(interaction.guildId),
        frozenNickname,
        reason,
      },
    });

    const log = await registerModerationLog(
      ModerationLogType.FREEZE_NICK,
      BigInt(interaction.user.id),
      BigInt(targetUser.id),
      BigInt(interaction.guildId),
      reason,
    );

    await sendModerationLog(
      new EmbedBuilder()
        .setTitle('🧊 Nickname Frozen')
        .setDescription(
          `**User:** ${targetUser.username} <@${targetUser.id}>\n` +
          `**Original Nickname:** ${originalNickname}\n` +
          `**Frozen Nickname:** ${frozenNickname}\n` +
          `**Reason:** ${reason}\n` +
          `**Moderator:** ${interaction.user.username} <@${interaction.user.id}>`,
        )
        .setFooter({ text: `ID: ${targetUser.id} | #${log.id}` })
        .setTimestamp()
        .setColor(Colors.BLUE),
    );

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: `${targetUser.username}'s nickname has been frozen`,
            iconURL: targetUser.avatarURL(),
          })
          .setColor(Colors.INVISIBLE)
          .addFields(
            {
              name: 'Original Nickname',
              value: originalNickname,
              inline: true,
            },
            {
              name: 'Frozen Nickname',
              value: frozenNickname,
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
