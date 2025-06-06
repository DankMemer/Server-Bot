import { Interaction } from 'discord.js';
import { getUser } from '../../utils/db';
import { autocompleteHandler } from './autocomplete';
import { commandsHandler } from './commands';
import { componentsHandler } from './components';
import { modalsHandler } from './modals';

export default async function interactionCreate(interaction: Interaction): Promise<void> {
  const userEntry = await getUser(interaction.user.id);

  await Promise.all([
    commandsHandler(interaction, userEntry),
    autocompleteHandler(interaction, userEntry),
    componentsHandler(interaction, userEntry),
    modalsHandler(interaction, userEntry),
  ]);
}
