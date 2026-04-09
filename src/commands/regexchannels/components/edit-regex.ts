import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { prismaClient } from '../../../lib/prisma-client';
import { Component, ComponentContext } from '../../../structures/component';
import { ephemeralResponse } from '../../../utils/format';
import { canManageMediaChannels } from '../../../utils/moderation';
import { formatRegex } from '../regex';

export class RegexChannelsEditRegexComponent extends Component {
  public override id = 'regexchannels-edit-regex';

  public override async execute({ interaction }: ComponentContext): Promise<void> {
    const member = interaction.guild.members.resolve(interaction.user.id);

    if (!member || !canManageMediaChannels(member)) {
      return void interaction.reply(ephemeralResponse('You do not have permission to manage regex channels.'));
    }

    const channelId = interaction.customId.split(':')[1];

    const regexChannel = await prismaClient.regexChannel.findUnique({
      where: { id: BigInt(channelId) },
    });

    if (!regexChannel) {
      return void interaction.reply(ephemeralResponse('This channel is no longer a regex channel.'));
    }

    return await interaction.showModal(
      new ModalBuilder()
        .setTitle('Edit Regex')
        .setCustomId(`regexchannels-edit-regex:${channelId}`)
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('regex')
              .setLabel('Regex (raw or /pattern/flags)')
              .setValue(formatRegex(regexChannel.pattern, regexChannel.flags))
              .setRequired(true)
              .setStyle(TextInputStyle.Paragraph),
          ),
        ),
    );
  }
}
