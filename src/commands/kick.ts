
import { ModerationLogType } from '@prisma/client';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { CONFIG } from '../config';
import { Colors } from '../constants/colors';
import { Command, CommandContext } from '../structures/command';
import { registerModerationLog, sendModerationLog } from '../utils/moderation-log';

export class KickCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to kick')
        .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Kick reason')
        .setRequired(true),
    );
  public override servers = [ CONFIG.ids.servers.dmc ];
  public override execute = async ({ interaction }: CommandContext): Promise<EmbedBuilder | string> => {
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);

    const member = interaction.guild.members.resolve(user.id);

    if (!member) {
      return 'Could not find this member. They probably left.';
    }

    try {
      await member.kick(`Kicked by ${interaction.user.username} | ${reason}`);
    } catch {
      return new EmbedBuilder()
        .setDescription('Could not kick this member.')
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
              name: `You've been kicked in ${interaction.guild.name}`,
              iconURL: interaction.guild.iconURL(),
            })
    				.setColor(Colors.INVISIBLE),
        ],
      })
      .catch(() => null);

    const log = await registerModerationLog(
      ModerationLogType.KICK,
      BigInt(interaction.user.id),
      BigInt(member.id),
      BigInt(interaction.guildId),
      reason,
    );

    await sendModerationLog(
      new EmbedBuilder()
        .setTitle('👞 Kick')
        .setDescription(
          `**Offender:** ${member.user.username} <@${member.id}>\n` +
          `**Reason:** ${reason}\n` +
          `**Moderator:** ${interaction.user.username} <@${interaction.user.id}>`,
        )
        .setFooter({ text: `ID: ${member.id} | #${log.id}` })
        .setTimestamp()
        .setColor(Colors.ORANGE),
    );

    interaction.reply({
      ephemeral: true,
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: `${member.user.username} has been kicked`,
            iconURL: member.user.avatarURL(),
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

