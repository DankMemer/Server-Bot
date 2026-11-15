import { GuildMember } from 'discord.js';
import HolyTime from 'holy-time';
import { logger } from '../../lib/logger';
import { memerClient, MemerUserLookup } from '../../lib/memer-client';

const KICK_DM_REASONS = {
  newAccount: 'To combat abuse, your account is too new to join this server.',
  noDankMemerCommands: 'This server is only available for Dank Memer players.',
  botBanned: 'You cannot be in this server while bot banned.',
};

export async function enforceNoNewAccounts(member: GuildMember): Promise<boolean> {
  if (!isMemberStillInGuild(member)) {
    return false;
  }

  if (HolyTime.since(member.user.createdAt) >= (HolyTime.Units.DAY * 10)) {
    return false;
  }

  const reason = 'Account younger than 10 days on join';

  try {
    await silentlyKick(member, reason, KICK_DM_REASONS.newAccount);
  } catch (error) {
    logger.error(`Failed to kick new account ${member.id}: ${error}`);
  }

  return true;
}

export async function enforceNoDankCommands(member: GuildMember, userLookup?: MemerUserLookup): Promise<boolean> {
  if (!isMemberStillInGuild(member)) {
    return false;
  }

  const lookup = userLookup ?? await memerClient.getUser(member.id);
  const isNonPlayer = lookup.status === 'not-found' ||
    (lookup.status === 'found' && lookup.user.commands === 0);

  if (!isNonPlayer) {
    return false;
  }

  const reason = 'Not a Dank Memer user';

  try {
    await silentlyKick(member, reason, KICK_DM_REASONS.noDankMemerCommands);
  } catch (error) {
    logger.error(`Failed to kick non-Dank Memer user ${member.id}: ${error}`);
  }

  return true;
}

export async function enforceBan(member: GuildMember, userLookup?: MemerUserLookup): Promise<boolean> {
  if (!isMemberStillInGuild(member)) {
    return false;
  }

  const lookup = userLookup ?? await memerClient.getUser(member.id);
  const ban = lookup.status === 'found' ? lookup.user.banned : null;

  if (ban?.is !== true || !Number.isFinite(ban.until) || HolyTime.between(HolyTime.now(), ban.until) <= HolyTime.Units.WEEK) {
    return false;
  }

  const reason = 'Banned from Dank Memer for longer than a week on join';

  try {
    await silentlyKick(member, reason, KICK_DM_REASONS.botBanned);
  } catch (error) {
    logger.error(`Failed to kick banned user ${member.id}: ${error}`);
  }

  return true;
}

function isMemberStillInGuild(member: GuildMember): boolean {
  return member.guild.members.cache.has(member.id);
}

async function silentlyKick(member: GuildMember, kickReason: string, dmReason: string): Promise<void> {
  await member.user.send(dmReason).catch(() => null);
  await member.kick(kickReason);
}
