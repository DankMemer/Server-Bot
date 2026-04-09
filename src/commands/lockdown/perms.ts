import { LockdownChannel } from '@prisma/client';
import { ChannelType, GuildChannel, PermissionFlagsBits, PermissionOverwriteOptions } from 'discord.js';
import { prismaClient } from '../../lib/prisma-client';

export type PermissionToken = 'send_messages' | 'send_in_threads' | 'create_posts' | 'send_in_posts';

type PermissionFlag = keyof typeof PermissionFlagsBits;

type PermissionDef = {
  token: PermissionToken;
  label: string;
  flag: PermissionFlag;
};

export const PERMISSION_DEFS: PermissionDef[] = [
  { token: 'send_messages', label: 'Send messages', flag: 'SendMessages' },
  { token: 'send_in_threads', label: 'Send messages in threads', flag: 'SendMessagesInThreads' },
  { token: 'create_posts', label: 'Create posts', flag: 'CreatePublicThreads' },
  { token: 'send_in_posts', label: 'Send messages in posts', flag: 'SendMessagesInThreads' },
];

const TOKEN_TO_DEF = new Map<PermissionToken, PermissionDef>(
  PERMISSION_DEFS.map(def => [def.token, def]),
);

export const PERMISSION_CHOICES = PERMISSION_DEFS.map(def => ({
  name: def.label,
  value: def.token,
}));

export function isVoiceChannel(channel: GuildChannel): boolean {
  return channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice;
}

export function tokenLabel(token: string | null): string {
  if (token === null) return 'default';
  const def = TOKEN_TO_DEF.get(token as PermissionToken);
  return def ? def.label : token;
}

export function tokenToFlag(token: string | null, channel: GuildChannel): PermissionFlag {
  if (token === null) {
    return isVoiceChannel(channel) ? 'Connect' : 'SendMessages';
  }
  const def = TOKEN_TO_DEF.get(token as PermissionToken);
  if (!def) {
    throw new Error(`Unknown lockdown permission token: ${token}`);
  }
  return def.flag;
}

export function resolveTargetID(rule: LockdownChannel, channel: GuildChannel): string {
  return rule.roleID ? rule.roleID.toString() : channel.guild.id;
}

function bitfieldToOptions(allow: bigint, deny: bigint): PermissionOverwriteOptions {
  const options: Record<string, boolean | null> = {};
  for (const [name, bit] of Object.entries(PermissionFlagsBits)) {
    if ((allow & bit) !== 0n) {
      options[name] = true;
    } else if ((deny & bit) !== 0n) {
      options[name] = false;
    } else {
      options[name] = null;
    }
  }
  return options as PermissionOverwriteOptions;
}

export async function lockRuleGroup(
  channel: GuildChannel,
  rules: LockdownChannel[],
  reason: string,
): Promise<void> {
  if (rules.length === 0) return;

  const targetID = resolveTargetID(rules[0], channel);
  const existing = channel.permissionOverwrites.cache.get(targetID);

  const snapshotAllow = (existing?.allow.bitfield ?? 0n).toString();
  const snapshotDeny = (existing?.deny.bitfield ?? 0n).toString();
  const hadOverwrite = !!existing;

  const denyOptions: Record<string, boolean> = {};
  for (const rule of rules) {
    const flag = tokenToFlag(rule.permission, channel);
    denyOptions[flag] = false;
  }

  await channel.permissionOverwrites.edit(targetID, denyOptions, { reason });

  await prismaClient.lockdownChannel.updateMany({
    where: {
      id: { in: rules.map(rule => rule.id) },
    },
    data: {
      locked: true,
      snapshotAllow,
      snapshotDeny,
      hadOverwrite,
    },
  });
}

export async function unlockRuleGroup(
  channel: GuildChannel,
  rules: LockdownChannel[],
  reason: string,
): Promise<void> {
  if (rules.length === 0) return;

  const targetID = resolveTargetID(rules[0], channel);

  // Pick the freshest snapshot in the group (rows are written together but be defensive).
  const source = [...rules]
    .filter(rule => rule.locked)
    .sort((a, z) => z.updatedAt.getTime() - a.updatedAt.getTime())[0] ?? rules[0];

  if (!source.hadOverwrite) {
    const existing = channel.permissionOverwrites.cache.get(targetID);
    if (existing) {
      await channel.permissionOverwrites.delete(targetID, reason);
    }
  } else {
    const allow = BigInt(source.snapshotAllow ?? '0');
    const deny = BigInt(source.snapshotDeny ?? '0');
    const options = bitfieldToOptions(allow, deny);
    await channel.permissionOverwrites.edit(targetID, options, { reason });
  }

  await prismaClient.lockdownChannel.updateMany({
    where: {
      id: { in: rules.map(rule => rule.id) },
    },
    data: {
      locked: false,
      snapshotAllow: null,
      snapshotDeny: null,
      hadOverwrite: false,
    },
  });
}

export function groupRulesByRole(rules: LockdownChannel[]): Map<string, LockdownChannel[]> {
  const groups = new Map<string, LockdownChannel[]>();
  for (const rule of rules) {
    const key = rule.roleID ? rule.roleID.toString() : 'everyone';
    const existing = groups.get(key);
    if (existing) {
      existing.push(rule);
    } else {
      groups.set(key, [rule]);
    }
  }
  return groups;
}
