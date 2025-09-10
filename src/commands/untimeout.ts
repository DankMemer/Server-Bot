
import { ModerationLogType } from '@prisma/client';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { CONFIG } from '../config';
import { Colors } from '../constants/colors';
import { Command, CommandContext } from '../structures/command';
import { canUntimeout } from '../utils/moderation';
import { registerModerationLog, sendModerationLog } from '../utils/moderation-log';

export class UntimeoutCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Untimeout a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to untimeout')
        .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Untimeout reason')
        .setRequired(true),
    );

  public override servers = [CONFIG.ids.servers.dmc];

  public override execute = async ({ interaction }: CommandContext): Promise<EmbedBuilder> => {
    const moderator = interaction.guild.members.resolve(interaction.user.id);

    if (!moderator || !canUntimeout(moderator)) {
      return new EmbedBuilder()
        .setDescription('You do not have permission to use this command.')
        .setColor(Colors.RED);
    }

    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);

    const member = interaction.guild.members.resolve(user.id);

    if (!member) {
      return new EmbedBuilder()
        .setDescription('Could not find this member. They probably left.')
        .setColor(Colors.RED);
    }

    try {
      await member.timeout(null, reason);
    } catch {
      return new EmbedBuilder()
        .setDescription('Could not untimeout this member.')
        .setColor(Colors.RED);
    }

    await member
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
              name: `You've been untimed out in ${interaction.guild.name}`,
              iconURL: interaction.guild.iconURL(),
            })
            .setColor(Colors.INVISIBLE),
        ],
      })
      .catch(() => null);

    const log = await registerModerationLog(
      ModerationLogType.UNTIME_OUT,
      BigInt(interaction.user.id),
      BigInt(member.id),
      BigInt(interaction.guildId),
      reason,
    );

    await sendModerationLog(
      new EmbedBuilder()
        .setTitle('🔊 Untime Out')
        .setDescription(
          `**Offender:** ${member.user.username} <@${member.id}>\n` +
          `**Reason:** ${reason}\n` +
          `**Moderator:** ${interaction.user.username} <@${interaction.user.id}>`,
        )
        .setFooter({ text: `ID: ${member.id} | #${log.id}` })
        .setTimestamp()
        .setColor(Colors.YELLOW),
    );

    return new EmbedBuilder()
      .setAuthor({
        name: `${member.user.username} has been untimed out`,
        iconURL: member.user.avatarURL(),
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

