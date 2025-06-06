import { ChannelType, Message } from 'discord.js';

export function crosspostHandler(message: Message): void {
  if (message.channel.type === ChannelType.GuildAnnouncement) {
    message.crosspost();
  }
}
