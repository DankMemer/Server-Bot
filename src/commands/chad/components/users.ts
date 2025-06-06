import { ActionRowBuilder, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Component, ComponentContext } from '../../../structures/component';
import { ephemeralResponse } from '../../../utils/format';
import { prismaClient } from '../../../lib/prisma-client';
import { CONFIG } from '../../../config';

export class ChadUsersComponent extends Component {
  public override id = 'chad-users';

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

    const users = [ ...discordChannel.permissionOverwrites.cache.keys() ]
      .filter(id => ![ userEntry.id.toString(), CONFIG.ids.servers.dmc ].includes(id));

    return await interaction.showModal(
      new ModalBuilder()
        .setTitle('Allowed Users')
        .setCustomId('chad-users')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>()
            .addComponents(
              new TextInputBuilder()
                .setCustomId('user1')
                .setLabel('User 1 ID:')
                .setValue(users[0] ?? '')
                .setRequired(false)
                .setStyle(TextInputStyle.Short),
            ),
          new ActionRowBuilder<TextInputBuilder>()
            .addComponents(
              new TextInputBuilder()
                .setCustomId('user2')
                .setLabel('User 2 ID:')
                .setValue(users[1] ?? '')
                .setRequired(false)
                .setStyle(TextInputStyle.Short),
            ),
        ),
    );
  }
}
