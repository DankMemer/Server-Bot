import { prismaClient } from '../../../lib/prisma-client';
import { Component, ComponentContext } from '../../../structures/component';
import { ephemeralResponse } from '../../../utils/format';
import { canManageMediaChannels } from '../../../utils/moderation';
import { buildRegexChannelEditReply, RegexChannelToggleKey } from '../ui';

const TOGGLE_FIELDS: Record<RegexChannelToggleKey, 'allowBotsBypass' | 'allowStaffBypass' | 'deleteAll'> = {
  botsBypass: 'allowBotsBypass',
  staffBypass: 'allowStaffBypass',
  deleteAll: 'deleteAll',
};

export class RegexChannelsToggleComponent extends Component {
  public override id = 'regexchannels-toggle';

  public override async execute({ interaction }: ComponentContext): Promise<void> {
    const member = interaction.guild.members.resolve(interaction.user.id);

    if (!member || !canManageMediaChannels(member)) {
      return void interaction.reply(ephemeralResponse('You do not have permission to manage regex channels.'));
    }

    const [, key, channelId] = interaction.customId.split(':');
    const toggleKey = key as RegexChannelToggleKey;
    const field = TOGGLE_FIELDS[toggleKey];

    if (!field) {
      return void interaction.reply(ephemeralResponse('Unknown setting.'));
    }

    const regexChannel = await prismaClient.regexChannel.findUnique({
      where: { id: BigInt(channelId) },
    });

    if (!regexChannel) {
      return void interaction.reply(ephemeralResponse('This channel is no longer a regex channel.'));
    }

    const updated = await prismaClient.regexChannel.update({
      where: { id: BigInt(channelId) },
      data: { [field]: !regexChannel[field] },
    });

    await interaction.update(buildRegexChannelEditReply(updated));
  }
}
