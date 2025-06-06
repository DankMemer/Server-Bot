import { Message } from 'discord.js';
import { getUser } from '../../utils/db';
import { advancementsHandler } from './advancements';
import { crosspostHandler } from './crosspost';
import { linkHandler } from './links';
import { listHandler } from './list';
import { xpHandler } from './xp';
import { usernameHandler } from './username';
import { suggestionsHandler } from './suggestions';

export default async function messageCreate(message: Message): Promise<void> {
  const userEntry = await getUser(message.author.id);

  crosspostHandler(message);
  advancementsHandler(message);
  listHandler(message);
  linkHandler(message);
  usernameHandler(message, userEntry);
  xpHandler(message, userEntry);
  suggestionsHandler(message);
}
