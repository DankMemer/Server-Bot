import { prismaClient } from '../../../lib/prisma-client';
import { Component, ComponentContext } from '../../../structures/component';
import { ephemeralResponse } from '../../../utils/format';
import { canManageMediaChannels } from '../../../utils/moderation';
import { buildMediaChannelEditReply, MediaChannelToggleKey } from '../ui';

const TOGGLE_FIELDS: Record<MediaChannelToggleKey, 'allowMultipleMedia' | 'allowBotsBypass' | 'allowStaffBypass' | 'allowVideos'> = {
  multipleMedia: 'allowMultipleMedia',
  botsBypass: 'allowBotsBypass',
  staffBypass: 'allowStaffBypass',
  videos: 'allowVideos',
};

export class MediaChannelToggleComponent extends Component {
  public override id = 'mediachannel-toggle';

  public override async execute({ interaction }: ComponentContext): Promise<void> {
    const member = interaction.guild.members.resolve(interaction.user.id);

    if (!member || !canManageMediaChannels(member)) {
      return void interaction.reply(ephemeralResponse('You do not have permission to manage media channels.'));
    }

    const [, key, channelId] = interaction.customId.split(':');
    const toggleKey = key as MediaChannelToggleKey;
    const field = TOGGLE_FIELDS[toggleKey];

    if (!field) {
      return void interaction.reply(ephemeralResponse('Unknown setting.'));
    }

    const mediaChannel = await prismaClient.mediaChannel.findUnique({
      where: { id: BigInt(channelId) },
    });

    if (!mediaChannel) {
      return void interaction.reply(ephemeralResponse('This channel is no longer a media channel.'));
    }

    const updated = await prismaClient.mediaChannel.update({
      where: { id: BigInt(channelId) },
      data: { [field]: !mediaChannel[field] },
    });

    await interaction.update(buildMediaChannelEditReply(updated));
  }
}
