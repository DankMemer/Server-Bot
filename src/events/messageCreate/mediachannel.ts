import { ChannelType, Message } from 'discord.js';
import { CONFIG } from '../../config';
import { logger } from '../../lib/logger';
import { prismaClient } from '../../lib/prisma-client';
import { isStaff } from '../../utils/moderation';

export async function mediaChannelHandler(message: Message): Promise<void> {
  if (message.guild?.id !== CONFIG.ids.servers.dmc) {
    return;
  }

  if (message.channel.type !== ChannelType.GuildText) {
    return;
  }

  const mediaChannel = await prismaClient.mediaChannel.findUnique({
    where: { id: BigInt(message.channel.id) },
  });

  if (!mediaChannel) {
    return;
  }

  if (message.author.bot && mediaChannel.allowBotsBypass) {
    return;
  }

  if (mediaChannel.allowStaffBypass && message.member && isStaff(message.member)) {
    return;
  }

  const attachments = [...message.attachments.values()];

  const isImage = (contentType: string | null): boolean => !!contentType && contentType.startsWith('image/');
  const isVideo = (contentType: string | null): boolean => !!contentType && contentType.startsWith('video/');

  const hasDisallowedAttachment = attachments.some(
    attachment => !isImage(attachment.contentType) && !isVideo(attachment.contentType),
  );

  if (hasDisallowedAttachment) {
    await deleteMessage(message);
    return;
  }

  const hasVideo = attachments.some(attachment => isVideo(attachment.contentType));

  if (hasVideo && !mediaChannel.allowVideos) {
    await deleteMessage(message);
    return;
  }

  const mediaCount = attachments.filter(
    attachment => isImage(attachment.contentType) || isVideo(attachment.contentType),
  ).length;

  if (mediaCount === 0) {
    await deleteMessage(message);
    return;
  }

  if (!mediaChannel.allowMultipleMedia && mediaCount > 1) {
    await deleteMessage(message);
    return;
  }
}

async function deleteMessage(message: Message): Promise<void> {
  try {
    await message.delete();
  } catch (error) {
    logger.error(`Failed to delete media channel message: ${error}`);
  }
}
