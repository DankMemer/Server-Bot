import { ChannelType } from 'discord.js';
import { prismaClient } from '../../../lib/prisma-client';
import { Modal, ModalContext } from '../../../structures/modal';
import { ephemeralResponse } from '../../../utils/format';
import { ChadCommand } from '../command';

export class ChadNameModal extends Modal {
  public override id = 'chad-name';

  public override async execute({ interaction, userEntry }: ModalContext): Promise<void> {
    const name =	interaction.fields.getTextInputValue('name');

    const chadChannel = await prismaClient.chadChannel.findUnique({
      where: {
        userID: userEntry.id,
      },
    });

    const discordChannel = interaction.guild.channels.resolve(chadChannel.id.toString());

    if (!discordChannel || discordChannel.type !== ChannelType.GuildText) {
      return void interaction.reply(ephemeralResponse('Something went wrong. Please contact badosz.'));
    }

    try {
      await discordChannel.setName(name.replaceAll(' ', '-').toLowerCase());
    } catch {
      return void interaction.reply(ephemeralResponse('Invalid channel name.'));
    }

    if (interaction.isFromMessage()) {
      interaction.update(ChadCommand.renderChadChannelMenu(discordChannel, userEntry.id));
    }
  }
}
