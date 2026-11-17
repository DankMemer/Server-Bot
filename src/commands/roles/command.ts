import { SlashCommandBuilder } from 'discord.js';
import { CONFIG } from '../../config';
import { logger } from '../../lib/logger';
import { Command, CommandContext } from '../../structures/command';
import { ephemeralResponse } from '../../utils/format';
import { fetchNotificationRoleMember } from './queue';
import { buildNotificationRolesReply } from './ui';

export class RolesCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Manage your notification roles in one menu')
    .setDMPermission(false);

  public override servers = [CONFIG.ids.servers.dmc];

  public override async execute({ interaction }: CommandContext): Promise<void> {
    if (!interaction.inCachedGuild() || interaction.guildId !== CONFIG.ids.servers.dmc) {
      await interaction.reply(ephemeralResponse('This command is only available in Dank Memer Community.'));
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const member = await fetchNotificationRoleMember(interaction.guild, interaction.user.id);
      await interaction.editReply(buildNotificationRolesReply(member));
    } catch (error) {
      logger.error(`Failed to load notification roles for '${interaction.user.id}': ${error.stack ?? error}`);
      await interaction.editReply({ content: 'Unable to load your notification roles. Please run /roles again.' });
    }
  }
}
