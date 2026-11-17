import { CONFIG } from '../../../config';
import { logger } from '../../../lib/logger';
import { Component, ComponentContext } from '../../../structures/component';
import { ephemeralResponse } from '../../../utils/format';
import { isValidNotificationRoleSelection, NOTIFICATION_ROLE_COMPONENT_ID } from '../constants';
import { queueNotificationRoleUpdate } from '../queue';
import { buildNotificationRolesReply } from '../ui';

export class NotificationRolesSelectComponent extends Component {
  public override id = NOTIFICATION_ROLE_COMPONENT_ID;

  public override async execute({ interaction }: ComponentContext): Promise<void> {
    if (!interaction.isStringSelectMenu()) {
      return;
    }

    const [, ownerId, groupId] = interaction.customId.split(':');

    if (!interaction.inCachedGuild() || interaction.guildId !== CONFIG.ids.servers.dmc || ownerId !== interaction.user.id) {
      await interaction.reply(ephemeralResponse('Please run /roles to manage your own notification roles.'));
      return;
    }

    // Limit removals to options actually shown in this dropdown. Missing or
    // unmanageable roles were omitted and must not be changed by clearing it.
    const roleIds = interaction.component.options.map(option => option.value);

    if (!isValidNotificationRoleSelection(groupId, roleIds, interaction.values)) {
      await interaction.reply(ephemeralResponse('This role selection is invalid. Please run /roles again.'));
      return;
    }

    await interaction.update(buildNotificationRolesReply(
      interaction.member,
      'Saving your selections… Changes are queued and may take a moment.',
      true,
    ));

    try {
      const result = await queueNotificationRoleUpdate(
        interaction.guild,
        interaction.user.id,
        groupId,
        roleIds,
        interaction.values,
      );
      const status = result.failed.length > 0
        ? '**Some changes could not be saved.** Your current roles are shown below. Please try again or contact staff.'
        : 'Your notification roles have been saved.';

      await interaction.editReply(buildNotificationRolesReply(result.member, status));
    } catch (error) {
      logger.error(`Failed to update notification roles for '${interaction.user.id}': ${error.stack ?? error}`);
      await interaction.editReply(buildNotificationRolesReply(
        interaction.member,
        'Unable to finish saving. Please run /roles again to check your current roles and retry.',
        true,
      ));
    }
  }
}
