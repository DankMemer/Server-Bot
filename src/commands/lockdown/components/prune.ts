import { EmbedBuilder } from 'discord.js';
import { Colors } from '../../../constants/colors';
import { prismaClient } from '../../../lib/prisma-client';
import { Component, ComponentContext } from '../../../structures/component';
import { ephemeralResponse } from '../../../utils/format';
import { canManageLockdown } from '../../../utils/moderation';

export class LockdownPruneConfirmComponent extends Component {
  public override id = 'lockdown-prune-confirm';

  public override async execute({ interaction }: ComponentContext): Promise<void> {
    const customIdParts = interaction.customId.split(':');

    if (interaction.user.id !== customIdParts[1]) {
      return void interaction.reply(ephemeralResponse('You cannot do this.'));
    }

    const moderatorMember = interaction.guild.members.resolve(interaction.user.id);
    
    if (!moderatorMember || !canManageLockdown(moderatorMember)) {
      return void interaction.reply(ephemeralResponse('You do not have permission to manage lockdown.'));
    }

    const ruleIdsToDelete = customIdParts[2] ? customIdParts[2].split(',').map(id => BigInt(id)) : [];

    if (ruleIdsToDelete.length === 0) {
      return void interaction.reply(ephemeralResponse('No rules specified for deletion.'));
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

    const result = await prismaClient.lockdownChannel.deleteMany({
      where: {
        id: {
          in: ruleIdsToDelete,
        },
        guildID: BigInt(interaction.guild.id), // Extra safety check
        locked: false, // Never prune locked rules — they have live snapshots to restore
      },
    });

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Lockdown Prune Complete')
          .setDescription(`Successfully removed ${result.count} invalid rule${result.count === 1 ? '' : 's'} from the lockdown system.`)
          .setColor(Colors.GREEN),
      ],
    });
  }
}
