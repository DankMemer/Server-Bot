import { Guild, GuildMember } from 'discord.js';
import { logger } from '../../lib/logger';
import { isValidNotificationRoleSelection } from './constants';

export type NotificationRoleUpdateResult = {
  member: GuildMember;
  added: string[];
  removed: string[];
  failed: string[];
};

type PendingRoleUpdate = {
  roleIds: string[];
  selectedRoleIds: string[];
  createdAt: number;
  promise: Promise<NotificationRoleUpdateResult>;
};

const guildQueues = new Map<string, Promise<NotificationRoleUpdateResult>>();
const pendingUpdates = new Map<string, PendingRoleUpdate>();
// Leave time to show the result before Discord's interaction token expires.
const MAX_QUEUE_AGE_MS = 10 * 60 * 1000;

export async function fetchNotificationRoleMember(guild: Guild, userId: string): Promise<GuildMember> {
  const [member] = await Promise.all([
    guild.members.fetch({ user: userId, force: true }),
    guild.roles.fetch(),
    guild.members.fetchMe(),
  ]);

  return member;
}

export function queueNotificationRoleUpdate(
  guild: Guild,
  userId: string,
  groupId: string,
  roleIds: readonly string[],
  selectedRoleIds: readonly string[],
): Promise<NotificationRoleUpdateResult> {
  if (!isValidNotificationRoleSelection(groupId, roleIds, selectedRoleIds)) {
    return Promise.reject(new Error('Invalid notification role selection.'));
  }

  const key = `${guild.id}:${userId}:${groupId}`;
  const pending = pendingUpdates.get(key);

  // The latest selection wins while an earlier update is still waiting its turn.
  if (pending) {
    pending.roleIds = [...roleIds];
    pending.selectedRoleIds = [...selectedRoleIds];
    return pending.promise;
  }

  const update: PendingRoleUpdate = {
    roleIds: [...roleIds],
    selectedRoleIds: [...selectedRoleIds],
    createdAt: Date.now(),
    promise: null,
  };
  const previous = guildQueues.get(guild.id) ?? Promise.resolve();

  update.promise = previous.catch(() => undefined).then(async () => {
    pendingUpdates.delete(key);

    if (Date.now() - update.createdAt > MAX_QUEUE_AGE_MS) {
      throw new Error('Notification role update expired while waiting in the queue.');
    }

    // Read current membership when the job starts, rather than when it was queued.
    let member = await fetchNotificationRoleMember(guild, userId);
    const selected = new Set(update.selectedRoleIds);
    const result: NotificationRoleUpdateResult = { member, added: [], removed: [], failed: [] };

    for (const roleId of update.roleIds) {
      const shouldHaveRole = selected.has(roleId);

      if (member.roles.cache.has(roleId) === shouldHaveRole) {
        continue;
      }

      const role = guild.roles.cache.get(roleId);

      if (!role?.editable) {
        result.failed.push(roleId);
        continue;
      }

      try {
        // Single-role PUT/DELETE calls preserve unrelated roles, even if staff or
        // another feature changes them concurrently. discord.js handles Discord's
        // rate-limit buckets and retry_after; all jobs in this guild run in order.
        member = shouldHaveRole
          ? await member.roles.add(roleId, 'Self-service notification roles via /roles')
          : await member.roles.remove(roleId, 'Self-service notification roles via /roles');
        result[shouldHaveRole ? 'added' : 'removed'].push(roleId);
      } catch (error) {
        result.failed.push(roleId);
        logger.error(`Failed to ${shouldHaveRole ? 'add' : 'remove'} notification role '${roleId}' for '${userId}' in '${guild.id}': ${error.message}`);
      }
    }

    result.member = member;
    return result;
  });

  pendingUpdates.set(key, update);
  guildQueues.set(guild.id, update.promise);

  const cleanup = (): void => {
    if (guildQueues.get(guild.id) === update.promise) {
      guildQueues.delete(guild.id);
    }
  };

  // Rejections must not block the next job or leave an unhandled cleanup promise.
  void update.promise.then(cleanup, cleanup);
  return update.promise;
}
