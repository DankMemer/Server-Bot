import { ChannelType, Message } from 'discord.js';

export async function crosspostHandler(message: Message): Promise<void> {
  if (message.channel.type === ChannelType.GuildAnnouncement) {
    await message.crosspost();
  }
}
