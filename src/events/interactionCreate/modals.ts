import { User } from '@prisma/client';
import { EmbedBuilder, Interaction, InteractionType, ModalMessageModalSubmitInteraction } from 'discord.js';
import { Modals } from '../../commands';
import { Colors } from '../../constants/colors';
import { logger } from '../../lib/logger';

export async function modalsHandler(interaction: Interaction, userEntry: User): Promise<void> {
  if (interaction.type !== InteractionType.ModalSubmit) {
    return;
  }

  const modal = Modals.get(interaction.customId.split(':')[0]);

  if (!modal) {
    return;
  }

  // TODO: make this logic a function
  try {
    const output = await modal.execute({
      interaction: interaction as ModalMessageModalSubmitInteraction,
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
