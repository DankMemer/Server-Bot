import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { Colors } from '../../../constants/colors';
import { prismaClient } from '../../../lib/prisma-client';
import { Component, ComponentContext } from '../../../structures/component';
import { ephemeralResponse } from '../../../utils/format';
import { canManageMediaChannels } from '../../../utils/moderation';
import { buildRegexChannelEditReply } from '../ui';

export class RegexChannelsDeleteComponent extends Component {
  public override id = 'regexchannels-delete';

  public override async execute({ interaction }: ComponentContext): Promise<void> {
    const member = interaction.guild.members.resolve(interaction.user.id);

    if (!member || !canManageMediaChannels(member)) {
      return void interaction.reply(ephemeralResponse('You do not have permission to manage regex channels.'));
    }

    const channelId = interaction.customId.split(':')[1];

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('Delete Regex Channel Configuration')
          .setDescription(`Are you sure you want to remove <#${channelId}> from the regex channel system?\n\nThis will also reset all of its settings.`)
          .setColor(Colors.ORANGE),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`regexchannels-delete-confirm:${channelId}`)
            .setLabel('Confirm Delete')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`regexchannels-delete-cancel:${channelId}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary),
        ),
      ],
    });
  }
}

export class RegexChannelsDeleteConfirmComponent extends Component {
  public override id = 'regexchannels-delete-confirm';

  public override async execute({ interaction }: ComponentContext): Promise<void> {
    const member = interaction.guild.members.resolve(interaction.user.id);

    if (!member || !canManageMediaChannels(member)) {
      return void interaction.reply(ephemeralResponse('You do not have permission to manage regex channels.'));
    }

    const channelId = interaction.customId.split(':')[1];

    await prismaClient.regexChannel.deleteMany({
      where: { id: BigInt(channelId) },
    });

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('Regex Channel Removed')
          .setDescription(`<#${channelId}> is no longer a regex channel.`)
          .setColor(Colors.GREEN),
      ],
      components: [],
    });
  }
}

export class RegexChannelsDeleteCancelComponent extends Component {
  public override id = 'regexchannels-delete-cancel';

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
      return void interaction.update({
        embeds: [
          new EmbedBuilder()
            .setTitle('Regex Channel Removed')
            .setDescription(`<#${channelId}> is no longer a regex channel.`)
            .setColor(Colors.GREEN),
        ],
        components: [],
      });
    }

    await interaction.update(buildRegexChannelEditReply(regexChannel));
  }
}
