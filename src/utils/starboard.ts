import { StarboardMessage } from '@prisma/client';
import { ButtonBuilder, ButtonStyle, Message, TextChannel, User } from 'discord.js';
import { CONFIG } from '../config';
import { discordClient } from '../lib/discord-client';
import { prismaClient } from '../lib/prisma-client';

export namespace Starboard {
  export function getChannel(): TextChannel {
    return discordClient.bot.channels.resolve(CONFIG.ids.channels.dmc.starboard) as TextChannel;
  }

  export function resolveLinkButton(message: Message): ButtonBuilder {
    const channel = discordClient.bot.channels.resolve(message.channelId) as TextChannel;

    return new ButtonBuilder()
      .setURL(`https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}`)
      .setStyle(ButtonStyle.Link)
      .setEmoji('🔗')
      .setLabel(`Posted in #${channel.name}`);
  }

  export async function getMessage(id: Message['id']): Promise<StarboardMessage | null> {
    return await prismaClient.starboardMessage.findFirst({
      where: {
        OR: [
          { messageID: BigInt(id) },
          { id: BigInt(id) },
        ],
      },
    });
  }

  export async function getDiscordMessage(id: StarboardMessage['channelID']): Promise<Message<true>> {
    const channel = Starboard.getChannel();
    const messages = await channel.messages.fetch({ limit: 100 });

    return messages.find(m => m.id === id.toString());
  }

  export async function addStar(messageID: StarboardMessage['id'], userID: User['id']): Promise<void> {
    await prismaClient.starboardMessageStar.upsert({
      where: {
        authorID_starboardMessageID: {
          authorID: BigInt(userID),
          starboardMessageID: messageID,
        },
      },
      update: {},
      create: {
        authorID: BigInt(userID),
        starboardMessageID: messageID,
      },
    });
  }

  export async function removeStar(messageID: StarboardMessage['id'], userID: User['id']): Promise<void> {
    await prismaClient.starboardMessageStar.deleteMany({ // NOTE: needs to be deleteMany because it might not exist
      where: {
        authorID: BigInt(userID),
        starboardMessageID: messageID,
      },
    });
  }

  export async function getStars(message: StarboardMessage): Promise<number> {
    return await prismaClient.starboardMessageStar.count({
      where: {
        starboardMessageID: message.id,
        NOT: [
          {
            authorID: message.authorID,
          },
        ],
      },
    });
  }
}
