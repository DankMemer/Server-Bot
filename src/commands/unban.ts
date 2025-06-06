
import { ModerationLogType } from '@prisma/client';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { CONFIG } from '../config';
import { Colors } from '../constants/colors';
import { Command, CommandContext } from '../structures/command';
import { registerModerationLog, sendModerationLog } from '../utils/moderation-log';

export class UnbanCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to unban')
        .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Unban reason')
        .setRequired(true),
    );
  public override servers = [ CONFIG.ids.servers.dmc ];
  public override execute = async ({ interaction }: CommandContext): Promise<EmbedBuilder | string> => {
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);

    try {
      await interaction.guild.members.unban(user.id, `Unbanned by ${interaction.user.username} | ${reason}`);
    } catch {
      return new EmbedBuilder()
        .setDescription('Could not unban this member.')
        .setColor(Colors.RED);
    }

    await user
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
              name: `You've been unbanned in ${interaction.guild.name}`,
              iconURL: interaction.guild.iconURL(),
            })
    				.setColor(Colors.INVISIBLE),
        ],
      })
      .catch(() => null);

    const log = await registerModerationLog(
      ModerationLogType.UNBAN,
      BigInt(interaction.user.id),
      BigInt(user.id),
      BigInt(interaction.guildId),
      reason,
    );

    await sendModerationLog(
      new EmbedBuilder()
        .setTitle('🙏 Unban')
        .setDescription(
          `**Offender:** ${user.username} <@${user.id}>\n` +
          `**Reason:** ${reason}\n` +
          `**Moderator:** ${interaction.user.username} <@${interaction.user.id}>`,
        )
        .setFooter({ text: `ID: ${user.id} | #${log.id}` })
        .setTimestamp()
        .setColor(Colors.GREEN),
    );

    return new EmbedBuilder()
      .setAuthor({
        name: `${user.username} has been unbanned`,
        iconURL: user.avatarURL(),
      })
      .addFields(
        {
          name: 'Reason',
          value: reason,
          inline: false,
        },
      );
  };
}
