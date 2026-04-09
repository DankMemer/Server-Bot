import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { Colors } from '../../../constants/colors';
import { prismaClient } from '../../../lib/prisma-client';
import { Component, ComponentContext } from '../../../structures/component';
import { ephemeralResponse } from '../../../utils/format';
import { canManageMediaChannels } from '../../../utils/moderation';
import { buildMediaChannelEditReply } from '../ui';

export class MediaChannelDeleteComponent extends Component {
  public override id = 'mediachannel-delete';

  public override async execute({ interaction }: ComponentContext): Promise<void> {
    const member = interaction.guild.members.resolve(interaction.user.id);

    if (!member || !canManageMediaChannels(member)) {
      return void interaction.reply(ephemeralResponse('You do not have permission to manage media channels.'));
    }

    const channelId = interaction.customId.split(':')[1];

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('Delete Media Channel Configuration')
          .setDescription(`Are you sure you want to remove <#${channelId}> from the media channel system?\n\nThis will also reset all of its settings.`)
          .setColor(Colors.ORANGE),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`mediachannel-delete-confirm:${channelId}`)
            .setLabel('Confirm Delete')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`mediachannel-delete-cancel:${channelId}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary),
        ),
      ],
    });
  }
}

export class MediaChannelDeleteConfirmComponent extends Component {
  public override id = 'mediachannel-delete-confirm';

  public override async execute({ interaction }: ComponentContext): Promise<void> {
    const member = interaction.guild.members.resolve(interaction.user.id);

    if (!member || !canManageMediaChannels(member)) {
      return void interaction.reply(ephemeralResponse('You do not have permission to manage media channels.'));
    }

    const channelId = interaction.customId.split(':')[1];

    await prismaClient.mediaChannel.deleteMany({
      where: { id: BigInt(channelId) },
    });

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('Media Channel Removed')
          .setDescription(`<#${channelId}> is no longer a media channel.`)
          .setColor(Colors.GREEN),
      ],
      components: [],
    });
  }
}

export class MediaChannelDeleteCancelComponent extends Component {
  public override id = 'mediachannel-delete-cancel';

  public override async execute({ interaction }: ComponentContext): Promise<void> {
    const member = interaction.guild.members.resolve(interaction.user.id);

    if (!member || !canManageMediaChannels(member)) {
      return void interaction.reply(ephemeralResponse('You do not have permission to manage media channels.'));
    }

    const channelId = interaction.customId.split(':')[1];

    const mediaChannel = await prismaClient.mediaChannel.findUnique({
      where: { id: BigInt(channelId) },
    });

    if (!mediaChannel) {
      return void interaction.update({
        embeds: [
          new EmbedBuilder()
            .setTitle('Media Channel Removed')
            .setDescription(`<#${channelId}> is no longer a media channel.`)
            .setColor(Colors.GREEN),
        ],
        components: [],
      });
    }

    await interaction.update(buildMediaChannelEditReply(mediaChannel));
  }
}
