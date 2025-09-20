import { Guild, GuildMember, PermissionsBitField, Role } from 'discord.js';
import { CONFIG } from '../config';

function canModerateUser(moderator: GuildMember, offender: GuildMember): boolean {
  if (!isMemberAboveRole(moderator, offender.roles.highest)) {
    return false;
  }

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

  return isMemberAboveRole(moderator, offender.roles.highest);
}

export function canDmUser(member: GuildMember): boolean {
  if (isStaff(member)) {
    return true;
  }

  if (hasBanPermission(member)) {
    return true;
  }

  if (isAdminOrManager(member)) {
    return true;
  }

  return false;
}

export function canModlog(member: GuildMember): boolean {
  return hasBanPermission(member);
}

export function canReason(member: GuildMember): boolean {
  return hasBanPermission(member);
}

export function canUnban(member: GuildMember): boolean {
  return hasBanPermission(member);
}

export function canUntimeout(member: GuildMember): boolean {
  return hasTimeoutPermission(member);
}

export function canAssignRole(member: GuildMember, targetRole: Role): boolean {
  if (isAdminOrManager(member)) {
    return isMemberAboveRole(member, targetRole);
  }

  if (isStaff(member)) {
    const staffRole = getStaffRole(member.guild);

    if (!staffRole) {
      return false; // Staff role not found
    }

    return isRoleAboveRole(staffRole, targetRole);
  }

  return false;
}

export function canManageAutomod(member: GuildMember): boolean {
  return isAdminOrManager(member);
}


export function canTimeoutUser(moderator: GuildMember, offender: GuildMember): boolean {
  if (!hasTimeoutPermission(moderator)) {
    return false;
  }

  return isMemberAboveRole(moderator, offender.roles.highest);
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

export function isStaff(member: GuildMember): boolean {
  const staffRoles = [
    CONFIG.ids.roles.dmc.staff,
    CONFIG.ids.roles.dmo.staff,
  ];

  return member.roles.cache.some(role =>
    staffRoles.includes(role.id)
  );
}

export function canUseRoleCommands(member: GuildMember): boolean {
  return isStaff(member) || isAdminOrManager(member);
}

function isTeam(member: GuildMember): boolean {
  return member.roles.cache.has(CONFIG.ids.roles.dmc.team);
}

function isStaffOrTeam(member: GuildMember): boolean {
  return isStaff(member) || isTeam(member);
}

export function isMemberAboveRole(member: GuildMember, role: Role): boolean {
  return member.roles.highest.position > role.position;
}

export function isRoleAboveRole(higherRole: Role, lowerRole: Role): boolean {
  return higherRole.position > lowerRole.position;
}

function getStaffRole(guild: Guild): Role | null {
  return guild.id === CONFIG.ids.servers.dmc
    ? guild.roles.cache.get(CONFIG.ids.roles.dmc.staff) || null
    : guild.roles.cache.get(CONFIG.ids.roles.dmo.staff) || null;
}

