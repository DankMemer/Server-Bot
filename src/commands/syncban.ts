import { ModerationLogType } from '@prisma/client';
import { EmbedBuilder, Guild, SlashCommandBuilder } from 'discord.js';
import { CONFIG } from '../config';
import { Colors } from '../constants/colors';
import { discordClient } from '../lib/discord-client';
import { Command, CommandContext } from '../structures/command';
import { canSyncBan } from '../utils/moderation';
import { markActionInFlight } from '../utils/moderation-action-cache';
import { registerModerationLog, sendModerationLog } from '../utils/moderation-log';

export class SyncBanCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('syncban')
    .setDescription('Ban a user in both DMC and DMO at once')
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
    );

  public override servers = [CONFIG.ids.servers.dmc, CONFIG.ids.servers.dmo];

  public override execute = async ({ interaction }: CommandContext): Promise<EmbedBuilder | void> => {
    const offender = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);

    const moderatorMember = interaction.guild.members.resolve(interaction.user.id);

    if (!moderatorMember) {
      return new EmbedBuilder()
        .setDescription('Could not find your member record.')
        .setColor(Colors.RED);
    }

    if (!canSyncBan(moderatorMember)) {
      return new EmbedBuilder()
        .setDescription('You do not have permission to use /syncban.')
        .setColor(Colors.RED);
    }

    const prefixedReason = `[Syncban] ${reason}`;

    const targetGuilds: Guild[] = [
      discordClient.bot.guilds.cache.get(CONFIG.ids.servers.dmc),
      discordClient.bot.guilds.cache.get(CONFIG.ids.servers.dmo),
    ].filter((guild): guild is Guild => guild !== undefined);

    await offender
      .send({
        embeds: [
          new EmbedBuilder()
            .addFields({
              name: 'Reason',
              value: prefixedReason,
              inline: false,
            })
            .setAuthor({
              name: 'You\'ve been banned from DMC and DMO',
              iconURL: interaction.guild.iconURL(),
            })
            .setColor(Colors.INVISIBLE),
        ],
      })
      .catch(() => null);

    const results: { guildName: string; success: boolean; error?: string }[] = [];

    for (const guild of targetGuilds) {
      try {
        markActionInFlight(guild.id, offender.id, 'BAN');
        await guild.members.ban(offender, {
          reason: `Syncbanned by ${interaction.user.username} | ${reason}`,
        });

        const log = await registerModerationLog(
          ModerationLogType.BAN,
          BigInt(interaction.user.id),
          BigInt(offender.id),
          BigInt(guild.id),
          prefixedReason,
        );

        await sendModerationLog(
          new EmbedBuilder()
            .setTitle('🔨 Ban (Syncban)')
            .setDescription(
              `**Offender:** ${offender.username} <@${offender.id}>\n` +
              `**Reason:** ${prefixedReason}\n` +
              `**Moderator:** ${interaction.user.username} <@${interaction.user.id}>`,
            )
            .setFooter({ text: `ID: ${offender.id} | #${log.id}` })
            .setTimestamp()
            .setColor(Colors.RED),
          guild.id,
        );

        results.push({ guildName: guild.name, success: true });
      } catch (error) {
        results.push({
          guildName: guild.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const summary = results
      .map(result => result.success
        ? `✅ **${result.guildName}** — banned`
        : `❌ **${result.guildName}** — failed${result.error ? ` (${result.error})` : ''}`)
      .join('\n');

    await interaction.reply({
      ephemeral: true,
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: `Syncban: ${offender.username}`,
            iconURL: offender.avatarURL(),
          })
          .setColor(Colors.INVISIBLE)
          .addFields(
            {
              name: 'Reason',
              value: reason,
              inline: false,
            },
            {
              name: 'Result',
              value: summary || 'No target guilds available.',
              inline: false,
            },
          ),
      ],
    });
  };
}
