
import { ModerationLogType } from '@prisma/client';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { CONFIG } from '../config';
import { Colors } from '../constants/colors';
import { Command, CommandContext } from '../structures/command';
import { canSyncBan } from '../utils/moderation';
import { markActionInFlight } from '../utils/moderation-action-cache';
import { registerModerationLog, sendModerationLog } from '../utils/moderation-log';

function parseUserIds(input: string): string[] {
  return input
    .split(/[\s,]+/)
    .map(id => id.trim())
    .filter(id => /^\d+$/.test(id));
}

export class MassKickCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('masskick')
    .setDescription('Kick multiple users at once')
    .setDefaultMemberPermissions('0')
    .addStringOption(option =>
      option
        .setName('users')
        .setDescription('User IDs separated by spaces or commas')
        .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Kick reason')
        .setRequired(true),
    );

  public override servers = [CONFIG.ids.servers.dmc, CONFIG.ids.servers.dmo];

  public override execute = async ({ interaction }: CommandContext): Promise<void> => {
    const moderatorMember = interaction.guild.members.resolve(interaction.user.id);

    if (!moderatorMember) {
      await interaction.reply({
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setDescription('Could not find your member record.')
            .setColor(Colors.RED),
        ],
      });
      return;
    }

    if (!canSyncBan(moderatorMember)) {
      await interaction.reply({
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setDescription('You do not have permission to use /masskick.')
            .setColor(Colors.RED),
        ],
      });
      return;
    }

    const usersInput = interaction.options.getString('users', true);
    const reason = interaction.options.getString('reason', true);
    const userIds = parseUserIds(usersInput);

    if (userIds.length === 0) {
      await interaction.reply({
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setDescription('No valid user IDs provided.')
            .setColor(Colors.RED),
        ],
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const kicked: string[] = [];
    const notInServer: string[] = [];
    const failed: string[] = [];

    for (const userId of userIds) {
      const offenderMember = interaction.guild.members.resolve(userId);

      if (!offenderMember) {
        notInServer.push(userId);
        continue;
      }

      try {
        await offenderMember.user
          .send({
            embeds: [
              new EmbedBuilder()
                .addFields({
                  name: 'Reason',
                  value: reason,
                  inline: false,
                })
                .setAuthor({
                  name: `You've been kicked in ${interaction.guild.name}`,
                  iconURL: interaction.guild.iconURL(),
                })
                .setColor(Colors.INVISIBLE),
            ],
          })
          .catch(() => null);

        markActionInFlight(interaction.guildId, userId, 'KICK');
        await offenderMember.kick(`Kicked by ${interaction.user.username} | ${reason}`);

        const log = await registerModerationLog(
          ModerationLogType.KICK,
          BigInt(interaction.user.id),
          BigInt(userId),
          BigInt(interaction.guildId),
          reason,
        );

        await sendModerationLog(
          new EmbedBuilder()
            .setTitle('👞 Kick (Mass Kick)')
            .setDescription(
              `**Offender:** ${offenderMember.user.username} <@${userId}>\n` +
              `**Reason:** ${reason}\n` +
              `**Moderator:** ${interaction.user.username} <@${interaction.user.id}>`,
            )
            .setFooter({ text: `ID: ${userId} | #${log.id}` })
            .setTimestamp()
            .setColor(Colors.ORANGE),
          interaction.guildId,
        );

        kicked.push(userId);
      } catch {
        failed.push(userId);
      }
    }

    const summaryParts: string[] = [];

    if (kicked.length > 0) {
      summaryParts.push(`✅ **Kicked (${kicked.length}):**\n${kicked.map(id => `<@${id}>`).join(', ')}`);
    }

    if (notInServer.length > 0) {
      summaryParts.push(`⚠️ **Not in server (${notInServer.length}):**\n${notInServer.map(id => `\`${id}\``).join(', ')}`);
    }

    if (failed.length > 0) {
      summaryParts.push(`❌ **Failed (${failed.length}):**\n${failed.map(id => `<@${id}>`).join(', ')}`);
    }

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Mass Kick Results')
          .setDescription(summaryParts.join('\n\n'))
          .setColor(Colors.INVISIBLE),
      ],
    });
  };
}
