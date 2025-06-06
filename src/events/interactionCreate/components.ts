import { User } from '@prisma/client';
import { EmbedBuilder, Interaction, InteractionType, MessageComponentInteraction } from 'discord.js';
import { Components } from '../../commands';
import { Colors } from '../../constants/colors';
import { logger } from '../../lib/logger';

export async function componentsHandler(interaction: Interaction, userEntry: User): Promise<void> {
  if (interaction.type !== InteractionType.MessageComponent) {
    return;
  }

  const component = Components.get(interaction.customId.split(':')[0]);

  if (!component) {
    return;
  }

  // TODO: make this logic a function
  try {
    const output = await component.execute({
      interaction: interaction as MessageComponentInteraction,
      userEntry,
    });

    if (typeof output === 'string') {
      interaction.reply({
        embeds: [
          new EmbedBuilder({
            color: Colors.INVISIBLE,
            description: output,
          }),
        ],
      });
    } else if (output instanceof EmbedBuilder) {
      if (!output.data.color) {
        output.setColor(Colors.INVISIBLE);
      }

      interaction.reply({
        embeds: [
          output,
        ],
      });
    }
  } catch (error: any) {
    logger.error(error.stack);
  }
}
