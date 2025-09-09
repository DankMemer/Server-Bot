import { SlashCommandBuilder } from 'discord.js';
import { CONFIG } from '../../config';
import { Command, CommandContext } from '../../structures/command';
import { canModlog } from '../../utils/moderation';
import { ModerationLogListPaginator } from './paginators/list';

export class ModerationLogCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('modlog')
    .setDescription('Check user\'s moderation log')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to check')
        .setRequired(true),
    );
  public override servers = [ CONFIG.ids.servers.dmc ];

  public static paginator = new ModerationLogListPaginator();

  public override execute = async ({ interaction }: CommandContext): Promise<void> => {
    const moderator = interaction.guild.members.resolve(interaction.user.id);
    
    if (!moderator || !canModlog(moderator)) {
      await interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true,
      });
      return;
    }

    const user = interaction.options.getUser('user', true);

    await ModerationLogCommand.paginator.start(interaction, user.id);
  };
}

