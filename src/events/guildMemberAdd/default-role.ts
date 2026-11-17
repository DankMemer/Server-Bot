import { GuildMember } from 'discord.js';
import { CONFIG } from '../../config';
import { DEFAULT_NOTIFICATION_ROLE_ID } from '../../constants/notification-roles';
import { logger } from '../../lib/logger';

export async function assignDefaultNotificationRole(member: GuildMember): Promise<void> {
  if (member.guild.id !== CONFIG.ids.servers.dmc || member.roles.cache.has(DEFAULT_NOTIFICATION_ROLE_ID)) {
    return;
  }

  try {
    await member.roles.add(DEFAULT_NOTIFICATION_ROLE_ID, 'Default notification role on join');
  } catch (error) {
    logger.error(`Failed to assign default notification role '${DEFAULT_NOTIFICATION_ROLE_ID}' to '${member.id}' in '${member.guild.id}': ${error}`);
  }
}
