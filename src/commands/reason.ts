import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { CONFIG } from '../config';
import { Colors } from '../constants/colors';
import { prismaClient } from '../lib/prisma-client';
import { Command, CommandContext } from '../structures/command';
import { canReason } from '../utils/moderation';
import { sendModerationLog } from '../utils/moderation-log';

export class ReasonCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('reason')
    .setDescription('Set moderation log reason')
    .addNumberOption(option =>
      option
        .setName('id')
        .setDescription('Moderation log ID')
        .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Timeout reason')
        .setRequired(true),
    );

  public override servers = [CONFIG.ids.servers.dmc];

  public override execute = async ({ interaction }: CommandContext): Promise<void> => {
    const moderator = interaction.guild.members.resolve(interaction.user.id);

    if (!moderator || !canReason(moderator)) {
      await interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true,
      });
      return;
    }

    const id = interaction.options.getNumber('id', true);
    const reason = interaction.options.getString('reason', true);

    const oldLog = await prismaClient.moderationLog.findUnique({
      where: {
        id: BigInt(id),
      },
    });

    if (!oldLog) {
      await interaction.reply({
        content: 'Could not find this moderation log.',
        ephemeral: true,
      });
      return;
    }

    await prismaClient.moderationLog.update({
      where: {
        id: BigInt(id),
      },
      data: {
        reason,
      },
    });

    await sendModerationLog(
      new EmbedBuilder()
        .setTitle('🗒️ Reason Update')
        .setDescription(
          `**Old Reason:** ${oldLog.reason ?? 'N/A'}\n` +
          `**New Reason:** ${reason}\n` +
          `**Moderator:** ${interaction.user.username} <@${interaction.user.id}>`,
        )
        .setFooter({ text: `#${oldLog.id}` })
        .setTimestamp()
        .setColor(Colors.WHITE),
    );

    await interaction.reply({
      ephemeral: true,
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: `Reason for #${oldLog.id} has been updated`,
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

