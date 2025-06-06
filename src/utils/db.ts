import { User } from '@prisma/client';
import { prismaClient } from '../lib/prisma-client';

export async function upsertUsers(users: bigint[]): Promise<void> {
  await Promise.all(users.map(async id => {
    const user = await prismaClient.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      await prismaClient.user.create({
        data: {
          id,
        },
      });
    }
  }));
}

export async function getUser(id: string | bigint): Promise<User> {
  let user = await prismaClient.user.findUnique({
    where: {
      id: BigInt(id),
    },
  });

  if (!user) {
    user = await prismaClient.user.create({
      data: {
        id: BigInt(id),
      },
    });
  }

  return user;
}
