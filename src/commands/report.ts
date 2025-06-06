
import { EmbedBuilder, SlashCommandBuilder, TextChannel } from 'discord.js';
import HolyTime from 'holy-time';
import { CONFIG } from '../config';
import { Colors } from '../constants/colors';
import { discordClient } from '../lib/discord-client';
import { Command, CommandContext } from '../structures/command';
import { ephemeralResponse } from '../utils/format';
import { DiscordTimestampFormat, formatDiscordTimestamp } from '../utils/time';

export class ReportCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('report')
    .setDescription('Report a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to report')
        .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Report reason')
        .setRequired(true),
    )
    .addAttachmentOption(option =>
      option
        .setName('proof')
        .setDescription('Report proof')
        .setRequired(false),
    );
  public override servers = [ CONFIG.ids.servers.dmc ];
  public override execute = async ({ interaction }: CommandContext): Promise<void | string> => {
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);
    const proof = interaction.options.getAttachment('proof', false);

    const member = interaction.guild.members.resolve(user.id);
    const reporter = interaction.guild.members.resolve(interaction.user.id);

    if (!member) {
      return 'Could not find this member. They probably left.';
    }

    const reportsChannel = discordClient.bot.channels.resolve(CONFIG.ids.channels.dmc.reports) as TextChannel;

    if (proof && !proof.contentType.startsWith('image')) {
      return void await interaction.reply(ephemeralResponse('Please attach an image instead!'));
    }

    await interaction.reply(ephemeralResponse('Successfully reported!'));

    await reportsChannel.send({
      embeds: [
        new EmbedBuilder({
          author: {
            name: member.user.username,
            icon_url: member.user.avatarURL(),
          },
          color: Colors.RED,
          description: `> ${reason.replaceAll('\n', '\n> ')}`,
          footer: {
            text: `Reporter ID: ${interaction.user.id}`,
          },
          timestamp: new Date(),
          fields: [
            {
              name: 'Reporter',
              value:
                `**Name:** ${interaction.user.username} <@${interaction.user.id}>\n` +
                `**Joined:** ${formatDiscordTimestamp(new HolyTime(reporter.joinedAt), DiscordTimestampFormat.RELATIVE_TIME)}\n` +
                `**Created:** ${formatDiscordTimestamp(new HolyTime(reporter.user.createdAt), DiscordTimestampFormat.RELATIVE_TIME)}\n`,
              inline: true,
            },
            {
              name: 'Reported',
              value:
                `**Name:** ${member.user.username} <@${member.user.id}>\n` +
                `**Joined:** ${formatDiscordTimestamp(new HolyTime(member.joinedAt), DiscordTimestampFormat.RELATIVE_TIME)}\n` +
                `**Created:** ${formatDiscordTimestamp(new HolyTime(member.user.createdAt), DiscordTimestampFormat.RELATIVE_TIME)}\n`,
              inline: true,
            },
          ],
          image: {
            url: proof ? proof.url : '',
          },
        }),
      ],
    });
  };
}

