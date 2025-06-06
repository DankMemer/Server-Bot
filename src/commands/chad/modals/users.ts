import { ChannelType } from 'discord.js';
import { prismaClient } from '../../../lib/prisma-client';
import { Modal, ModalContext } from '../../../structures/modal';
import { ephemeralResponse } from '../../../utils/format';
import { ChadCommand } from '../command';
import { CONFIG } from '../../../config';

export class ChadUsersModal extends Modal {
  public override id = 'chad-users';

  public override async execute({ interaction, userEntry }: ModalContext): Promise<void> {
    const user1 = interaction.fields.getTextInputValue('user1').trim();
    const user2 = interaction.fields.getTextInputValue('user2').trim();

    const chadChannel = await prismaClient.chadChannel.findUnique({
      where: {
        userID: userEntry.id,
      },
    });

    const discordChannel = interaction.guild.channels.resolve(chadChannel.id.toString());

    if (!discordChannel || discordChannel.type !== ChannelType.GuildText) {
      return void interaction.reply(ephemeralResponse('Something went wrong. Please contact badosz.'));
    }

    const oldUsers = [ ...discordChannel.permissionOverwrites.cache.keys() ]
      .filter(id => ![ userEntry.id.toString(), CONFIG.ids.servers.dmc ].includes(id));
    const newUsers = [ user1, user2 ].filter(Boolean);

    for (const newUser of newUsers) {
      const member = interaction.guild.members.resolve(newUser);

      if (!member) {
        return void interaction.reply(ephemeralResponse('Could not find this user. This user might not be cached or the provided ID is invalid.'));
      }
    }

    for (const oldUser of oldUsers) {
      await discordChannel.permissionOverwrites.delete(oldUser);
    }

    for (const newUser of newUsers) {
      await discordChannel.permissionOverwrites.create(newUser, {
        ViewChannel: true,
        SendMessages: true,
        EmbedLinks: true,
        AttachFiles: true,
        ReadMessageHistory: true,
        UseExternalEmojis: true,
        SendMessagesInThreads: true,
      });
    }

    if (interaction.isFromMessage()) {
      interaction.update(ChadCommand.renderChadChannelMenu(discordChannel, userEntry.id));
    }
  }
}
