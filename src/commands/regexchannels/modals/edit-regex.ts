import { prismaClient } from '../../../lib/prisma-client';
import { Modal, ModalContext } from '../../../structures/modal';
import { ephemeralResponse } from '../../../utils/format';
import { canManageMediaChannels } from '../../../utils/moderation';
import { parseRegex } from '../regex';
import { buildRegexChannelEditReply } from '../ui';

export class RegexChannelsEditRegexModal extends Modal {
  public override id = 'regexchannels-edit-regex';

  public override async execute({ interaction }: ModalContext): Promise<void> {
    const member = interaction.guild.members.resolve(interaction.user.id);

    if (!member || !canManageMediaChannels(member)) {
      return void interaction.reply(ephemeralResponse('You do not have permission to manage regex channels.'));
    }

    const channelId = interaction.customId.split(':')[1];
    const regexInput = interaction.fields.getTextInputValue('regex');

    const parsed = parseRegex(regexInput);
    if (!parsed) {
      return void interaction.reply(ephemeralResponse('Invalid regex. Provide a valid pattern or use `/pattern/flags` syntax.'));
    }

    const regexChannel = await prismaClient.regexChannel.findUnique({
      where: { id: BigInt(channelId) },
    });

    if (!regexChannel) {
      return void interaction.reply(ephemeralResponse('This channel is no longer a regex channel.'));
    }

    const updated = await prismaClient.regexChannel.update({
      where: { id: BigInt(channelId) },
      data: {
        pattern: parsed.pattern,
        flags: parsed.flags,
      },
    });

    if (interaction.isFromMessage()) {
      await interaction.update(buildRegexChannelEditReply(updated));
    } else {
      await interaction.reply(ephemeralResponse('Regex updated.'));
    }
  }
}
