
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { CONFIG } from '../config';
import { Colors } from '../constants/colors';
import { Command, CommandContext } from '../structures/command';

export class SupportCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('support')
    .setDescription('Manage user\'s support role')
    .addSubcommand(option =>
      option
        .setName('add')
        .setDescription('Add support role to the user')
        .addUserOption(subOption =>
          subOption
            .setName('user')
            .setDescription('Member you would like to add the role to')
            .setRequired(true),
        ),
    )
    .addSubcommand(option =>
      option
        .setName('remove')
        .setDescription('Remove support fole from the user')
        .addUserOption(subOption =>
          subOption
            .setName('user')
            .setDescription('Member you would like to remove the role from')
            .setRequired(true),
        ),
    )
    .addSubcommand(option =>
      option
        .setName('clear')
        .setDescription('Remove support role from everyone'),
    )
    .addSubcommand(option =>
      option
        .setName('list')
        .setDescription('List everyone with support role'),
    );
  public override servers = [ CONFIG.ids.servers.dmo ];
  public override execute = async ({ interaction }: CommandContext): Promise<string | EmbedBuilder> => {
    const action = interaction.options.getSubcommand();
    const { support } = CONFIG.ids.roles.dmo;

    switch (action) {
      case 'add': {
        const user = interaction.options.getUser('user', true);
        const member = interaction.guild.members.resolve(user.id);

        if (!member) {
          return 'Could not find this member. They probably left.';
        }

        member.roles.add(support);

        return `Added <@&${support}> to <@${member.id}>.`;
      }

      case 'remove': {
        const user = interaction.options.getUser('user', true);
        const member = interaction.guild.members.resolve(user.id);

        if (!member) {
          return 'Could not find this member. They probably left.';
        }

        member.roles.remove(support);

        return `Removed <@&${support}> from <@${member.id}>.`;
      }

      case 'clear': {
        await interaction.deferReply();

        const { members } = interaction.guild.roles.cache.get(support);

        for (const member of members.values()) {
          await member.roles.remove(support);
        }

        return void interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(`Removed <@&${support}> from **${members.size}** member${members.size === 1 ? '' : 's'}.`) // TOOD: pluralize utils
              .setColor(Colors.INVISIBLE),
          ],
        });
      }

      case 'list': {
        const { members } = interaction.guild.roles.cache.get(support);

        return members.size === 0
          ? 'None'
          : [ ...members.keys() ]
            .map((m) => `<@${m}> - ${m}`)
            .join('\n');
      }
    }
  };
}
