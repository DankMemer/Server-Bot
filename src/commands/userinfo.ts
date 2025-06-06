
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { CONFIG } from '../config';
import { Colors } from '../constants/colors';
import { Command, CommandContext } from '../structures/command';

export class UserInfoCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Check user info')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to check')
        .setRequired(true),
    );
  public override servers = [ CONFIG.ids.servers.dmc, CONFIG.ids.servers.dmo ];
  public override execute = ({ interaction }: CommandContext): EmbedBuilder => {
    const user = interaction.options.getUser('user', true);
    const member = interaction.guild.members.resolve(user.id);

    return new EmbedBuilder()
      .setAuthor({ name: 'User Info' })
      .setThumbnail(user.avatarURL())
      .addFields(
        {
          name: 'Username',
          value: user.username,
          inline: true,
        },
        {
          name: 'ID',
          value: user.id,
          inline: true,
        },
        {
          name: 'Nickname',
          value: member?.nickname ?? '-',
          inline: true,
        },
        {
          name: 'Highest Role',
          value: member ? member.roles.highest.name : '-',
          inline: true,
        },
        {
          name: 'Created',
          value: `<t:${Math.floor(user.createdAt.getTime() / 1000)}:R>`, // TODO: util this bc I HATE it
          inline: true,
        },
        {
          name: 'Joined',
          value: `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>`, // TODO: util this bc I HATE it
          inline: true,
        },
      )
      .setColor(Colors.INVISIBLE);
  };
}

