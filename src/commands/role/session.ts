import { redisClient } from '../../lib/redis-client';
import type { RoleAssignmentSession } from './types';

const SESSION_TTL = 1800; // 30 minutes
const SESSION_KEY_PREFIX = 'role-session';

export async function createRoleSession(sessionId: string, data: RoleAssignmentSession): Promise<void> {
  const key = `${SESSION_KEY_PREFIX}:${sessionId}`;

  await redisClient.hSet(key, {
    moderatorId: data.moderatorId,
    roleId: data.roleId,
    usersInput: data.usersInput,
    guildId: data.guildId,
    createdAt: data.createdAt.toString()
  });

  await redisClient.expire(key, SESSION_TTL);
}

export async function consumeRoleSession(sessionId: string): Promise<RoleAssignmentSession | null> {
  try {
    const key = `${SESSION_KEY_PREFIX}:${sessionId}`;

    const result = await redisClient.hGetAll(key);

    if (!result || Object.keys(result).length === 0) {
      return null; // Hash does not exist or is empty
    }

    await redisClient.del(key);

    return result as unknown as RoleAssignmentSession;
  } catch {
    return null;
  }
}
