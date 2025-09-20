import { EmbedBuilder } from 'discord.js';
import { Colors } from '../../../constants/colors';
import { Component, ComponentContext } from '../../../structures/component';
import { ephemeralResponse } from '../../../utils/format';

export class LockdownPruneCancelComponent extends Component {
  public override id = 'lockdown-prune-cancel';

  public override async execute({ interaction }: ComponentContext): Promise<void> {
    const customIdParts = interaction.customId.split(':');

    if (interaction.user.id !== customIdParts[1]) {
      return void interaction.reply(ephemeralResponse('You cannot do this.'));
    }

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('Lockdown Prune Cancelled')
          .setDescription('The prune operation has been cancelled. No channels were removed from the lockdown system.')
          .setColor(Colors.RED),
      ],
      components: [],
    });
  }
}
