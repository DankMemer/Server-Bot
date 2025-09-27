import { prismaClient } from '../lib/prisma-client';
import { redisClient } from '../lib/redis-client';

const CACHE_TTL = 300; // 5 minutes
const CACHE_KEY = 'allowed-urls';

export async function getAllowedUrls(): Promise<string[]> {
  const exists = await redisClient.exists(CACHE_KEY);

  if (exists) {
    return await redisClient.sMembers(CACHE_KEY);
  }

  const urls = await fetchUrlsFromDatabase();

  await redisClient.sAdd(CACHE_KEY, urls);
  await redisClient.expire(CACHE_KEY, CACHE_TTL);

  return urls;
}

export async function fetchUrlsFromDatabase(): Promise<string[]> {
  const results = await prismaClient.allowedUrl.findMany({
    select: { url: true },
    orderBy: { url: 'asc' },
  });

  return results.map(result => result.url);
}

export async function addAllowedUrl(url: string, addedBy: string): Promise<void> {
  await prismaClient.allowedUrl.create({
    data: {
      url,
      addedBy: BigInt(addedBy),
    },
  });

  await invalidateCache();
}

export async function removeAllowedUrl(url: string): Promise<void> {
  await prismaClient.allowedUrl.deleteMany({
    where: {
      url,
    },
  });

  await invalidateCache();
}

export async function isUrlAllowed(url: string): Promise<boolean> {
  const allowedUrls = await getAllowedUrls();

  return allowedUrls.includes(url);
}

async function invalidateCache(): Promise<void> {
  await redisClient.del(CACHE_KEY);
}
