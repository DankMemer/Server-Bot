import { redisClient } from '../lib/redis-client';

const FROZEN_NICKNAME_DM_COOLDOWN_SECONDS = 60; // 1 minute cooldown
const COOLDOWN_KEY_PREFIX = 'frozen-nickname-dm-cooldown';

export async function isUserOnDmCooldown(userId: string): Promise<boolean> {
  const key = `${COOLDOWN_KEY_PREFIX}:${userId}`;

  const exists = await redisClient.exists(key);

  return exists === 1;
}

export async function setUserDmCooldown(userId: string): Promise<void> {
  const key = `${COOLDOWN_KEY_PREFIX}:${userId}`;

  await redisClient.setEx(key, FROZEN_NICKNAME_DM_COOLDOWN_SECONDS, '1');
}
