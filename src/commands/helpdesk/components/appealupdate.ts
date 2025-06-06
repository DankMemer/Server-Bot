import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Component, ComponentContext } from '../../../structures/component';

export class HelpDeskAppealUpdateComponent extends Component {
  public override id = 'helpdesk-appealupdate';

  public override async execute({ interaction }: ComponentContext): Promise<void> {
    const userID = interaction.customId.split(':')[1];
    const accepted = interaction.customId.split(':')[2] === 'accept';

    return await interaction.showModal(
      new ModalBuilder()
        .setTitle('DMC Appeal Update')
        .setCustomId(`helpdesk-appealupdate:${userID}:${accepted}`)
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>()
            .addComponents(
              new TextInputBuilder()
                .setCustomId('message')
                .setLabel('Optional Message:')
                .setRequired(false)
                .setStyle(TextInputStyle.Paragraph),
            ),
        ),
    );
  }
}
