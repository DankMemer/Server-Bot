import { EmbedBuilder } from 'discord.js';
import { Colors } from '../../../constants/colors';
import { Component, ComponentContext } from '../../../structures/component';
import { ephemeralResponse } from '../../../utils/format';

export class RoleAddMultiCancelComponent extends Component {
  public override id = 'role-addmulti-cancel';

  public override async execute({ interaction }: ComponentContext): Promise<void> {
    const customIdParts = interaction.customId.split(':');

    if (interaction.user.id !== customIdParts[1]) {
      return void interaction.reply(ephemeralResponse('You cannot do this.'));
    }

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('Multi-Role Assignment Cancelled')
          .setDescription('The role assignment has been cancelled.')
          .setColor(Colors.RED),
      ],
      components: [],
    });
  }
}
