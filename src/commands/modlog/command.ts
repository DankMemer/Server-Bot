import { SlashCommandBuilder } from 'discord.js';
import { CONFIG } from '../../config';
import { Command, CommandContext } from '../../structures/command';
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
    const user = interaction.options.getUser('user', true);

    await ModerationLogCommand.paginator.start(interaction, user.id);
  };
}

