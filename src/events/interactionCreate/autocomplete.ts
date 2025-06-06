import { User } from '@prisma/client';
import { AutocompleteInteraction, Interaction, InteractionType } from 'discord.js';
import { Commands } from '../../commands';
import { logger } from '../../lib/logger';

export async function autocompleteHandler(interaction: Interaction, userEntry: User): Promise<void> {
  if (interaction.type !== InteractionType.ApplicationCommandAutocomplete) {
    return;
  }

  const command = Commands.get(interaction.commandName);

  if (!command?.autocomplete) {
    return;
  }

  try {
    const output = await command.autocomplete({
      value: interaction.options.getFocused(),
      interaction: interaction as AutocompleteInteraction,
      userEntry,
    });

    interaction.respond(output.slice(0, 25));
  } catch (error: any) {
    logger.error(error.stack);
  }
}
