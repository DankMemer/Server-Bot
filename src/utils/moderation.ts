import { GuildMember, PermissionsBitField } from 'discord.js';
import { CONFIG } from '../config';

const LEVEL_ADMIN = 0;
const LEVEL_NONE = -1;

function canModerateUser(moderator: GuildMember, offender: GuildMember): boolean {
  if (isAdminOrManager(offender)) {
    return false;
  }

  if (isStaffOrTeam(offender)) {
    return isAdminOrManager(moderator);
  }

  return true;
}

export function canBanUser(moderator: GuildMember, offender: GuildMember): boolean {
  if (!hasBanPermission(moderator)) {
    return false;
  }

  return canModerateUser(moderator, offender);
}

export function canKickUser(moderator: GuildMember, offender: GuildMember): boolean {
  if (!hasKickPermission(moderator)) {
    return false;
  }

  return canModerateUser(moderator, offender);
}

export function canDecancer(moderator: GuildMember, target: GuildMember): boolean {
  if (!hasManageNicknamesPermission(moderator)) {
    return false;
  }

  return canModerateUser(moderator, target);
}

export function canManageLockdown(member: GuildMember): boolean {
  return isAdminOrManager(member);
}

export function canFreezeNickname(moderator: GuildMember, offender: GuildMember): boolean {
  if (!hasManageNicknamesPermission(moderator)) {
    return false;
  }

  return moderator.roles.highest.position > offender.roles.highest.position;
}

function getTimeoutHierarchyLevel(member: GuildMember): number {
  if (isAdminOrManager(member)) {
    return LEVEL_ADMIN;
  }

  const hierarchyLevels = {
    [CONFIG.ids.roles.dmc.communityManager]: 1, // Community Manager (DMC only)
    [CONFIG.ids.roles.dmc.moderator]: 2,        // Moderator
    [CONFIG.ids.roles.dmo.moderator]: 2,        // Moderator (same level as DMC)
    [CONFIG.ids.roles.dmc.trialModerator]: 3,   // Trial Moderator (lowest)
    [CONFIG.ids.roles.dmo.trialModerator]: 3,   // Trial Moderator (lowest)
  };

  for (const roleId of member.roles.cache.keys()) {
    if (roleId in hierarchyLevels) {
      return hierarchyLevels[roleId];
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

function hasBanPermission(member: GuildMember): boolean {
  return member.permissions.has(PermissionsBitField.Flags.BanMembers);
}

function hasKickPermission(member: GuildMember): boolean {
  return member.permissions.has(PermissionsBitField.Flags.KickMembers);
}

function hasAdminPermission(member: GuildMember): boolean {
  return member.permissions.has(PermissionsBitField.Flags.Administrator);
}

function hasManagerPermission(member: GuildMember): boolean {
  return member.permissions.has(PermissionsBitField.Flags.ManageGuild);
}

function hasManageNicknamesPermission(member: GuildMember): boolean {
  return member.permissions.has(PermissionsBitField.Flags.ManageNicknames);
}

function isAdminOrManager(member: GuildMember): boolean {
  return (
    hasAdminPermission(member) ||
    hasManagerPermission(member) ||
    member.roles.cache.has(CONFIG.ids.roles.dmc.serverManager) ||
    member.roles.cache.has(CONFIG.ids.roles.dmo.serverManager)
  );
}

function isStaffOrTeam(member: GuildMember): boolean {
  const staffTeamRoles = [
    CONFIG.ids.roles.dmc.staff,
    CONFIG.ids.roles.dmc.team,
    CONFIG.ids.roles.dmo.staff,
  ];

  return member.roles.cache.some(role =>
    staffTeamRoles.includes(role.id)
  );
}

