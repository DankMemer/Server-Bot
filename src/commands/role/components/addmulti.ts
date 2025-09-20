import { EmbedBuilder } from 'discord.js';
import { Colors } from '../../../constants/colors';
import { Component, ComponentContext } from '../../../structures/component';
import { ephemeralResponse } from '../../../utils/format';
import { canAssignRole } from '../../../utils/moderation';
import { parseUsers } from '../../../utils/user-parsing';
import { consumeRoleSession } from '../session';

export class RoleAddMultiConfirmComponent extends Component {
  public override id = 'role-addmulti-confirm';

  public override async execute({ interaction }: ComponentContext): Promise<void> {
    const sessionId = interaction.customId.split(':')[1];

    const sessionData = await consumeRoleSession(sessionId);
    if (!sessionData) {
      return void interaction.reply(ephemeralResponse('Session expired. Please try the command again.'));
    }

    if (interaction.user.id !== sessionData.moderatorId) {
      return void interaction.reply(ephemeralResponse('You cannot do this.'));
    }

    const role = await interaction.guild.roles.fetch(sessionData.roleId);
    if (!role) {
      return void interaction.reply(ephemeralResponse('Role not found.'));
    }

    const authorMember = interaction.guild.members.resolve(interaction.user.id);

    if (!authorMember || !canAssignRole(authorMember, role)) {
      return void interaction.reply(ephemeralResponse('You do not have permission to assign this role.'));
    }

    if (role.guild.id === role.id) {
      return void interaction.reply(ephemeralResponse('@everyone is not a valid role'));
    }

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('Processing Role Assignment')
          .setDescription('Adding roles to users...')
          .setColor(Colors.YELLOW),
      ],
      components: [],
    });

    try {
      const members = await parseUsers(sessionData.usersInput, interaction.guild);

      const successes: string[] = [];
      const failures: string[] = [];

      for (const member of members) {
        try {
          await member.roles.add(role.id);
          successes.push(member.user.username);
        } catch {
          failures.push(member.user.username);
        }
      }

      const embed = new EmbedBuilder()
        .setTitle('Role Assignment Complete')
        .setColor(successes.length > 0 ? Colors.GREEN : Colors.RED);

      let description = `**Added <@&${role.id}> to ${successes.length}/${members.length} users**\n\n`;

      if (successes.length > 0) {
        description += `**Successful (${successes.length}):**\n${successes.join(', ')}\n\n`;
      }

      if (failures.length > 0) {
        description += `**Failed (${failures.length}):**\n${failures.join(', ')}`;
      }

      embed.setDescription(description);

      await interaction.editReply({
        embeds: [embed],
      });

    } catch (error) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('User Parsing Failed')
            .setDescription(error?.message ?? 'An unexpected error occurred while processing users.')
            .setColor(Colors.RED),
        ],
      });
    }
  }
}
