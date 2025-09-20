import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { CONFIG } from '../../config';
import { Colors } from '../../constants/colors';
import { Command, CommandContext } from '../../structures/command';
import { canManageAutomod } from '../../utils/moderation';
import { handleAllowAdd, handleAllowList, handleAllowRemove } from './allow';

export class AutomodCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Manage automoderation settings')
    .addSubcommandGroup(group =>
      group
        .setName('allow')
        .setDescription('Manage allowed URLs')
        .addSubcommand(subcommand =>
          subcommand
            .setName('list')
            .setDescription('List all allowed URLs')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add a URL to the allowed list')
            .addStringOption(option =>
              option
                .setName('url')
                .setDescription('URL to allow (without protocol, e.g., example.com/path)')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove a URL from the allowed list')
            .addStringOption(option =>
              option
                .setName('url')
                .setDescription('URL to remove (without protocol, e.g., example.com/path)')
                .setRequired(true)
            )
        )
    );

  public override servers = [CONFIG.ids.servers.dmc];

  public override execute = async ({ interaction }: CommandContext): Promise<void> => {
    const moderatorMember = interaction.guild.members.resolve(interaction.user.id);

    await interaction.deferReply({ ephemeral: true });

    if (!moderatorMember || !canManageAutomod(moderatorMember)) {
      const embed = new EmbedBuilder()
        .setDescription('You do not have permission to manage automod settings.')
        .setColor(Colors.RED);

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const subcommandGroup = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    if (subcommandGroup === 'allow') {
      switch (subcommand) {
        case 'list':
          await handleAllowList(interaction);
          break;
        case 'add':
          await handleAllowAdd(interaction);
          break;
        case 'remove':
          await handleAllowRemove(interaction);
          break;
      }
    }
  };
}
