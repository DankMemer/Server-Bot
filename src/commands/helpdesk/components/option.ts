import { ActionRowBuilder, ModalBuilder, SelectMenuInteraction, TextInputBuilder, TextInputStyle } from 'discord.js';
import { redisClient } from '../../../lib/redis-client';
import { Component, ComponentContext } from '../../../structures/component';
import { ephemeralResponse } from '../../../utils/format';
import { HELP_DESK_OPTIONS } from '../constants';

export class HelpDeskOptionComponent extends Component {
  public override id = 'helpdesk-option';

  public override async execute({ interaction }: ComponentContext): Promise<void> {
    const selected = (interaction as SelectMenuInteraction).values[0];
    const option = HELP_DESK_OPTIONS.find(o => o.name === selected);

    if (option.name === 'DMC Appeal') {
      if (await redisClient.get(`appeal-cooldown:${interaction.user.id}`)) {
        return void interaction.reply(ephemeralResponse('You can only appeal once every two weeks!'));
      }

      return await interaction.showModal(
        new ModalBuilder()
          .setTitle('DMC Appeal')
          .setCustomId('helpdesk-appeal')
          .addComponents(
            new ActionRowBuilder<TextInputBuilder>()
              .addComponents(
                new TextInputBuilder()
                  .setCustomId('appeal')
                  .setLabel('Your appeal:')
                  .setMinLength(100)
                  .setStyle(TextInputStyle.Paragraph),
              ),
          ),
      );
    }

    if (option.role) {
      const member = interaction.guild.members.resolve(interaction.user.id);
      member.roles.add(option.role);
    }

    interaction.reply(ephemeralResponse(option.response));
  }
}
