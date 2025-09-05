import { GuildMember, PermissionsBitField } from 'discord.js';
import { CONFIG } from '../config';

const LEVEL_ADMIN = 0;
const LEVEL_NONE = -1;

function getTimeoutHierarchyLevel(member: GuildMember): number {
  if (isAdminOrManager(member)) {
    return LEVEL_ADMIN;
  }

  const hierarchyLevels = {
    [ CONFIG.ids.roles.dmc.communityManager ]: 1, // Community Manager (DMC only)
    [ CONFIG.ids.roles.dmc.moderator ]: 2,        // Moderator
    [ CONFIG.ids.roles.dmo.moderator ]: 2,        // Moderator (same level as DMC)
    [ CONFIG.ids.roles.dmc.trialModerator ]: 3,   // Trial Moderator (lowest)
    [ CONFIG.ids.roles.dmo.trialModerator ]: 3,   // Trial Moderator (lowest)
  };

  for (const roleId of member.roles.cache.keys()) {
    if (roleId in hierarchyLevels) {
      return hierarchyLevels[ roleId ];
    }
  }

  return LEVEL_NONE;
};

export function canTimeoutUser(moderator: GuildMember, offender: GuildMember): boolean {
  if (!hasTimeoutPermission(moderator)) {
    return false;
  }

  const moderatorLevel = getTimeoutHierarchyLevel(moderator);
  const offenderLevel = getTimeoutHierarchyLevel(offender);

  if (offenderLevel === LEVEL_NONE) {
    return true;
  }

  if (moderatorLevel === LEVEL_NONE) {
    return false;
  }

  return moderatorLevel <= offenderLevel;
}

function hasTimeoutPermission(member: GuildMember): boolean {
  return member.permissions.has(PermissionsBitField.Flags.ModerateMembers);
}

function hasAdminPermission(member: GuildMember): boolean {
  return member.permissions.has(PermissionsBitField.Flags.Administrator);
}

function hasManagerPermission(member: GuildMember): boolean {
  return member.permissions.has(PermissionsBitField.Flags.ManageGuild);
}

function isAdminOrManager(member: GuildMember): boolean {
  return (
    hasAdminPermission(member) ||
    hasManagerPermission(member) ||
    member.roles.cache.has(CONFIG.ids.roles.dmc.serverManager) ||
    member.roles.cache.has(CONFIG.ids.roles.dmo.serverManager)
  );
}
