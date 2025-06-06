import { User } from '@prisma/client';
import { ChatInputCommandInteraction, EmbedBuilder, Interaction, InteractionType } from 'discord.js';
import { Commands } from '../../commands';
import { Colors } from '../../constants/colors';
import { logger } from '../../lib/logger';

export async function commandsHandler(interaction: Interaction, userEntry: User): Promise<void> {
  if (interaction.type !== InteractionType.ApplicationCommand) {
    return;
  }

  const command = Commands.get(interaction.commandName);

  if (!command) {
    return;
  }

  try {
    const output = await command.execute({
      interaction: interaction as ChatInputCommandInteraction,
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
