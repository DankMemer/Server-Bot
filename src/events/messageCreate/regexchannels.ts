import { ChannelType, Message } from 'discord.js';
import { tryBuildRegExp } from '../../commands/regexchannels/regex';
import { CONFIG } from '../../config';
import { logger } from '../../lib/logger';
import { prismaClient } from '../../lib/prisma-client';
import { isStaff } from '../../utils/moderation';

export async function regexChannelHandler(message: Message): Promise<void> {
  if (message.guild?.id !== CONFIG.ids.servers.dmc && message.guild?.id !== CONFIG.ids.servers.dmo) {
    return;
  }

  if (message.channel.type !== ChannelType.GuildText) {
    return;
  }

  const regexChannel = await prismaClient.regexChannel.findUnique({
    where: { id: BigInt(message.channel.id) },
  });

  if (!regexChannel) {
    return;
  }

  if (message.author.bot && regexChannel.allowBotsBypass) {
    return;
  }

  if (regexChannel.allowStaffBypass && message.member && isStaff(message.member)) {
    return;
  }

  if (regexChannel.deleteAll) {
    await deleteMessage(message);
    return;
  }

  const regex = tryBuildRegExp(regexChannel.pattern, regexChannel.flags);
  if (!regex) {
    logger.error(`Invalid regex stored for channel ${regexChannel.id}: /${regexChannel.pattern}/${regexChannel.flags}`);
    return;
  }

  if (!regex.test(message.content)) {
    await deleteMessage(message);
  }
}

async function deleteMessage(message: Message): Promise<void> {
  try {
    await message.delete();
  } catch (error) {
    logger.error(`Failed to delete regex channel message: ${error}`);
  }
}
