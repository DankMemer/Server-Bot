import { RegexChannel } from '@prisma/client';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { Colors } from '../../constants/colors';
import { formatRegex } from './regex';

export type RegexChannelToggleKey = 'botsBypass' | 'staffBypass' | 'deleteAll';

export const TOGGLE_LABELS: Record<RegexChannelToggleKey, string> = {
  botsBypass: 'Bots Bypass',
  staffBypass: 'Staff Bypass',
  deleteAll: 'Delete All',
};

export function getToggleValue(regexChannel: RegexChannel, key: RegexChannelToggleKey): boolean {
  switch (key) {
    case 'botsBypass':
      return regexChannel.allowBotsBypass;
    case 'staffBypass':
      return regexChannel.allowStaffBypass;
    case 'deleteAll':
      return regexChannel.deleteAll;
  }
}

export function buildRegexChannelEditReply(regexChannel: RegexChannel): {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
} {
  const channelId = regexChannel.id.toString();

  const fmt = (label: string, value: boolean): string =>
    `**${label}:** ${value ? 'Enabled' : 'Disabled'}`;

  const regexDisplay = regexChannel.deleteAll
    ? '_Delete All mode is active — all messages are removed and the regex is ignored._'
    : `\`${formatRegex(regexChannel.pattern, regexChannel.flags)}\``;

  const embed = new EmbedBuilder()
    .setTitle('Regex Channel Settings')
    .setDescription(
      [
        `Configuration for <#${channelId}>`,
        '',
        `**Regex:** ${regexDisplay}`,
        '',
        fmt('Allow Bots to Bypass', regexChannel.allowBotsBypass),
        fmt('Allow Staff to Bypass', regexChannel.allowStaffBypass),
        fmt('Delete All', regexChannel.deleteAll),
      ].join('\n'),
    )
    .setColor(Colors.INVISIBLE);

  const toggleButton = (key: RegexChannelToggleKey): ButtonBuilder => {
    const enabled = getToggleValue(regexChannel, key);
    return new ButtonBuilder()
      .setCustomId(`regexchannels-toggle:${key}:${channelId}`)
      .setLabel(TOGGLE_LABELS[key])
      .setStyle(enabled ? ButtonStyle.Success : ButtonStyle.Secondary);
  };

  const settingsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    toggleButton('botsBypass'),
    toggleButton('staffBypass'),
    toggleButton('deleteAll'),
  );

  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`regexchannels-edit-regex:${channelId}`)
      .setLabel('Edit Regex')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`regexchannels-delete:${channelId}`)
      .setLabel('Delete')
      .setStyle(ButtonStyle.Danger),
  );

  return {
    embeds: [embed],
    components: [settingsRow, actionRow],
  };
}
