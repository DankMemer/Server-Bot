import { EmbedBuilder } from 'discord.js';
import { Colors } from '../../../constants/colors';
import { prismaClient } from '../../../lib/prisma-client';
import { Component, ComponentContext } from '../../../structures/component';
import { ephemeralResponse } from '../../../utils/format';

export class LockdownPruneConfirmComponent extends Component {
  public override id = 'lockdown-prune-confirm';

  public override async execute({ interaction }: ComponentContext): Promise<void> {
    const customIdParts = interaction.customId.split(':');

    if (interaction.user.id !== customIdParts[1]) {
      return void interaction.reply(ephemeralResponse('You cannot do this.'));
    }

    const channelIdsToDelete = customIdParts[2] ? customIdParts[2].split(',').map(id => BigInt(id)) : [];

    if (channelIdsToDelete.length === 0) {
      return void interaction.reply(ephemeralResponse('No channels specified for deletion.'));
    }

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('Lockdown Prune')
          .setDescription('Processing...')
          .setColor(Colors.YELLOW),
      ],
      components: [],
    });

    await prismaClient.lockdownChannel.deleteMany({
      where: {
        id: {
          in: channelIdsToDelete,
        },
        guildID: BigInt(interaction.guild.id), // Extra safety check
      },
    });

    const channelList = channelIdsToDelete
      .map(id => `<#${id}> (\`${id}\`)`)
      .join('\n');

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Lockdown Prune Complete')
          .setDescription(`Successfully removed ${channelIdsToDelete.length} invalid channel${channelIdsToDelete.length === 1 ? '' : 's'} from lockdown system:\n\n${channelList}`)
          .setColor(Colors.GREEN),
      ],
    });
  }
}
