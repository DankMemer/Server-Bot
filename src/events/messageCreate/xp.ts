import { User } from '@prisma/client';
import { ChannelType, Message } from 'discord.js';
import { CONFIG } from '../../config';
import { prismaClient } from '../../lib/prisma-client';
import { redisClient } from '../../lib/redis-client';
import { randomNumber } from '../../utils/number';
import { getLevel } from '../../utils/levels';

export async function xpHandler(message: Message, userEntry: User): Promise<void> {
  if (message.guild?.id !== CONFIG.ids.servers.dmc) {
    return;
  }

  if (message.channel.type !== ChannelType.GuildText) {
    return;
  }

  if (message.content.length < 5) {
    return;
  }

  if (message.author.bot) {
    return;
  }

  if (await redisClient.get(`xp-cooldown:${message.author.id}`)) {
    return;
  }

  const xp = message.member.roles.cache.has(CONFIG.ids.roles.dmc.chad)
    ? randomNumber(25, 30)
    : randomNumber(15, 30);
  const level = getLevel(Number(userEntry.experience) + xp);

  const rolesToGive = Object
    .entries(CONFIG.ids.roles.dmc.levels)
    .filter(([ l, roleID ]) =>
      level >= Number(l) && !message.member.roles.cache.has(roleID),
    )
    .map(([ _, roleID ]) => roleID);

  if (rolesToGive.length > 0) {
    await message.member.roles.add(rolesToGive);
  }

  await Promise.all([
    prismaClient.user.update({
      where: {
        id: userEntry.id,
      },
      data: {
        experience: {
          increment: xp,
        },
      },
    }),
    redisClient.setEx(`xp-cooldown:${message.author.id}`, 15, '1'),
    redisClient.zAdd('xp-leaderboard',
      { score: Number(userEntry.experience) + xp, value: message.author.id },
    ),
  ]);
}
