import { User } from '@prisma/client';
import { ChatInputCommandInteraction, EmbedBuilder, Interaction, InteractionReplyOptions, InteractionType } from 'discord.js';
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
    const commandInteraction = interaction as ChatInputCommandInteraction;

    const output = await command.execute({
      interaction: commandInteraction,
      userEntry,
    });

    if (typeof output === 'string') {
      await replyInteraction(commandInteraction, {
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

      await replyInteraction(commandInteraction, {
        embeds: [
          output,
        ],
      });
    }
  } catch (error: any) {
    logger.error(error.stack);
  }
}

async function replyInteraction(interaction: ChatInputCommandInteraction, embedData: InteractionReplyOptions): Promise<void> {
  if (interaction.deferred) {
    await interaction.editReply(embedData);
  } else {
    await interaction.reply(embedData);
  }
}
