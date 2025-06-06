import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, Message, MessageReaction, User } from 'discord.js';
import { CONFIG } from '../../config';
import { STARBOARD_REQUIRED_STARS } from '../../constants/starboard';
import { discordClient } from '../../lib/discord-client';
import { prismaClient } from '../../lib/prisma-client';
import { upsertUsers } from '../../utils/db';
import { Starboard } from '../../utils/starboard';

export default async function messageReactionAdd(reaction: MessageReaction, user: User): Promise<void> {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch {
      return;
    }
  }

  const { message, emoji, users } = reaction;

  if (message.guildId !== CONFIG.ids.servers.dmc) {
    return;
  }

  if (emoji.name !== '⭐') {
    return;
  }

  if (message.partial) {
    await message.fetch();
  }

  if ((!message.content || message.content.length === 0) && !message.attachments.first() && message.embeds.length === 0) {
    return;
  }

  if (user.id === discordClient.bot.application.id) {
    return;
  }

  const starboardChannel = Starboard.getChannel();
  const reactions = await users.fetch();

  let starboardMessage = await Starboard.getMessage(message.id);

  if (starboardMessage) {
    const discordMessage = await Starboard.getDiscordMessage(starboardMessage.id);

    if (!discordMessage) {
      return;
    }

    await upsertUsers([ BigInt(user.id) ]);
    await Starboard.addStar(starboardMessage.id, user.id);

    const stars = await Starboard.getStars(starboardMessage);

    return void await discordMessage.edit({
      content: `✨ **${stars.toLocaleString()}**`,
      embeds: [
        new EmbedBuilder(discordMessage.embeds[0].toJSON()),
      ],
      components: discordMessage.components,
    });
  }

  if (reactions.filter(u => u.id !== message.author.id).size < STARBOARD_REQUIRED_STARS) {
    return;
  }

  const embed = new EmbedBuilder({
    color: 0xFFAC33,
    author: {
      name: message.author.username,
      icon_url: message.author.avatarURL(),
    },
    description: message.content,
    image: {
      url: '',
    },
    footer: {
      text: message.id,
    },
    timestamp: message.createdAt,
  });

  if (message.reference?.messageId) {
    try {
      const repliedToMessage = await message.channel.messages.fetch(message.reference?.messageId);
      let replyContent = !repliedToMessage.content && repliedToMessage.attachments.size > 0
        ? repliedToMessage.attachments.first().name
        : repliedToMessage.content.replace(/\n/g, ' ');

      replyContent = replyContent.length > 300
        ? `${replyContent.slice(0, 300)}...`
        : replyContent;

      embed.setDescription(
        `> **Reply to ${message.mentions.repliedUser.username}**:\n` +
        `> ${replyContent}${embed.data.description.length > 0 ? '\n\n' : ''}` +
        embed.data.description,
      );
    } catch {}
  }

  if (message.embeds.length > 0) {
    const images = message.embeds
      .filter(em => em.data.thumbnail || em.data.image)
      .map(em => em.data.thumbnail ? em.data.thumbnail.url : em.data.image.url);

    if (images.length > 0) {
      embed.setImage(
        images[0]
          .replace(/(?<url>^https:\/\/media.tenor.com\/.*)(?<id>AAAAD\/)(?<any>.*)(?<ext>\.png|\.jpg)/, '$1AAAAC/$3.gif')
          .replace(/(?<url>^https:\/\/thumbs.gfycat.com\/.*-)(?<type>poster\.jpg)/, '$1size_restricted.gif'),
      );
    }

    if (message.content === '') {
      const messageEmbed = message.embeds[0];

      if (messageEmbed.description) {
        embed.setDescription(messageEmbed.description);
      } else if (messageEmbed.fields?.[0]?.value) {
        embed.setDescription(messageEmbed.fields[0].value);
      }
    }
  } else if (message.attachments.size > 0) {
    embed.setImage(message.attachments.first().url);
  }

  const discordStarboardMessage = await starboardChannel.send({
    content: `✨ **${reactions.filter(u => u.id !== message.author.id).size}**`,
    embeds: [ embed ],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(Starboard.resolveLinkButton(message as Message)),
    ],
  });

  await upsertUsers([ BigInt(message.author.id) ]);

  starboardMessage = await prismaClient.starboardMessage.create({
    data: {
      id: BigInt(discordStarboardMessage.id),
      authorID: BigInt(message.author.id),
      channelID: BigInt(message.channel.id),
      messageID: BigInt(message.id),
      context: message.content.length > 0
        ? message.content
        : message.attachments.size > 0
          ? message.attachments.first().name
          : embed.data.description,
    },
  });

  await upsertUsers(reactions.map(u => BigInt(u.id)));
  await Promise.all(reactions.map(u => Starboard.addStar(starboardMessage.id, u.id)));
  await discordStarboardMessage.react('⭐');
}
