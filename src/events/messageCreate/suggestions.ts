import { Message } from 'discord.js';

export async function suggestionsHandler(message: Message): Promise<void> {
  if (message.author.bot) {
    return;
  }

  if (message.channel.id !== '1276915305205207154') {
    return;
  }

  await message.react('👍');
  await message.react('👎');
}
