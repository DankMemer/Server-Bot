import { User } from '@prisma/client';
import { ChannelType, Message } from 'discord.js';
import { prismaClient } from '../../lib/prisma-client';

export async function usernameHandler(message: Message, userEntry: User): Promise<void> {
  if (message.channel.type !== ChannelType.GuildText) {
    return;
  }

  if (userEntry.username === message.author.username) {
    return;
  }

  await prismaClient.user.update({
    where: {
      id: userEntry.id,
    },
    data: {
      username: message.author.username,
    },
  });
}
