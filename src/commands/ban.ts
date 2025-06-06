import { ModerationLogType } from '@prisma/client';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import HolyTime from 'holy-time';
import { CONFIG } from '../config';
import { Colors } from '../constants/colors';
import { Command, CommandContext } from '../structures/command';
import { registerModerationLog, sendModerationLog } from '../utils/moderation-log';
import { discordClient } from '../lib/discord-client';

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
  public override servers = [ CONFIG.ids.servers.dmc ];
  public override execute = async ({ interaction }: CommandContext): Promise<EmbedBuilder | string> => {
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);
    const deleteMessageSeconds = interaction.options.getString('delete_messages', false);

    const offender = interaction.guild.members.resolve(user.id)?.user ?? await discordClient.bot.users.fetch(user.id);

    if (!offender) {
      return 'Could not find this member. They probably left.';
    }

    try {
      await interaction.guild.members.ban(user, {
        reason: `Banned by ${interaction.user.username} | ${reason}`,
        ...(deleteMessageSeconds ? { deleteMessageSeconds: Number.parseInt(deleteMessageSeconds) / HolyTime.Units.SECOND } : {}),
      });
    } catch {
      return new EmbedBuilder()
        .setDescription('Could not ban this member.')
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
            )
            .setAuthor({
              name: `You've been banned in ${interaction.guild.name}`,
              iconURL: interaction.guild.iconURL(),
            })
    				.setColor(Colors.INVISIBLE),
        ],
      })
      .catch(() => null);

    const log = await registerModerationLog(
      ModerationLogType.BAN,
      BigInt(interaction.user.id),
      BigInt(offender.id),
      BigInt(interaction.guildId),
      reason,
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

    interaction.reply({
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

