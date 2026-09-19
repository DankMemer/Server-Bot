import { Message, TextChannel } from 'discord.js';
import { buildSupportMessage, NEW_PLAYER_HELP_CHANNEL_ID } from '../../commands/helpdesk/support';

export async function newPlayerHelpHandler(message: Message): Promise<void> {
  if (message.channel.id !== NEW_PLAYER_HELP_CHANNEL_ID || message.author.bot) {
    return;
  }

  await (message.channel as TextChannel).send(buildSupportMessage(message.author.id));
}
