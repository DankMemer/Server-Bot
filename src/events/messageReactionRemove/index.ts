import { EmbedBuilder, MessageReaction, User } from 'discord.js';
import { CONFIG } from '../../config';
import { STARBOARD_REQUIRED_STARS } from '../../constants/starboard';
import { discordClient } from '../../lib/discord-client';
import { prismaClient } from '../../lib/prisma-client';
import { Starboard } from '../../utils/starboard';

export default async function messageReactionRemove(reaction: MessageReaction, user: User): Promise<void> {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch {
      return;
    }
  }

  const { message, emoji } = reaction;

  if (message.guildId !== CONFIG.ids.servers.dmc) {
    return;
  }

  if (emoji.name !== '⭐') {
    return;
  }

  if (message.partial) {
    await message.fetch();
  }

  if (user.id === discordClient.bot.application.id) {
    return;
  }

  const starboardMessage = await Starboard.getMessage(message.id);

  if (!starboardMessage) {
    return;
  }

  await Starboard.removeStar(starboardMessage.id, user.id);

  const stars = await Starboard.getStars(starboardMessage);
  const discordMessage = await Starboard.getDiscordMessage(starboardMessage.id);

  if (starboardMessage && stars < STARBOARD_REQUIRED_STARS) {
    await prismaClient.starboardMessage.delete({ where: { id: starboardMessage.id } });

    try {
      await discordMessage?.delete();
    } catch {}

    return;
  }

  await discordMessage?.edit({
    content: `✨ **${stars.toLocaleString()}**`,
    embeds: [
      new EmbedBuilder(discordMessage.embeds[0].toJSON()),
    ],
    components: discordMessage.components,
  });
}
