import { ActionRowBuilder, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Component, ComponentContext } from '../../../structures/component';
import { ephemeralResponse } from '../../../utils/format';
import { prismaClient } from '../../../lib/prisma-client';

export class ChadNameComponent extends Component {
  public override id = 'chad-name';

  public override async execute({ interaction, userEntry }: ComponentContext): Promise<void> {
    if (interaction.user.id !== interaction.customId.split(':')[1]) {
      return void interaction.reply(ephemeralResponse('You cannot do this.'));
    }

    const chadChannel = await prismaClient.chadChannel.findUnique({
      where: {
        userID: userEntry.id,
      },
    });

    const discordChannel = interaction.guild.channels.resolve(chadChannel.id.toString());

    if (!discordChannel || discordChannel.type !== ChannelType.GuildText) {
      return void interaction.reply(ephemeralResponse('Something went wrong. Please contact badosz.'));
    }

    return await interaction.showModal(
      new ModalBuilder()
        .setTitle('Channel Name')
        .setCustomId('chad-name')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>()
            .addComponents(
              new TextInputBuilder()
                .setCustomId('name')
                .setLabel('Name:')
                .setValue(discordChannel.name)
                .setRequired()
                .setStyle(TextInputStyle.Short),
            ),
        ),
    );
  }
}
