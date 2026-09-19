import { AnyThreadChannel } from 'discord.js';
import { buildSupportMessage, NEW_PLAYER_HELP_CHANNEL_ID } from '../../commands/helpdesk/support';
import { discordClient } from '../../lib/discord-client';

export default async function threadCreate(thread: AnyThreadChannel, newlyCreated: boolean): Promise<void> {
  if (
    !newlyCreated ||
    thread.parentId !== NEW_PLAYER_HELP_CHANNEL_ID ||
    !thread.ownerId ||
    thread.ownerId === discordClient.bot.user.id
  ) {
    return;
  }

  await thread.send(buildSupportMessage(thread.ownerId));
}
