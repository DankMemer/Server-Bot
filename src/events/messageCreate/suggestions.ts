import { Message } from 'discord.js';

export async function suggestionsHandler(message: Message): Promise<void> {
  // if (message.author.bot) {
  //   return;
  // }

  // 8/20/25 - admins asked me to add this to carl-reports, so disabled bot check. I'm not making a whole ass new file for the same functionality sorry.

  if (message.channel.id !== '1276915305205207154' && message.channel.id !== '754491912190427207') {
    return;
  }

  await message.react('👍');
  await message.react('👎');
}
