import { MediaChannel } from '@prisma/client';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { Colors } from '../../constants/colors';

export type MediaChannelToggleKey = 'multipleMedia' | 'botsBypass' | 'staffBypass' | 'videos' | 'text';

export const TOGGLE_LABELS: Record<MediaChannelToggleKey, string> = {
  multipleMedia: 'Multiple Media Uploads',
  botsBypass: 'Bots Bypass',
  staffBypass: 'Staff Bypass',
  videos: 'Videos',
  text: 'Text',
};

export function getToggleValue(mediaChannel: MediaChannel, key: MediaChannelToggleKey): boolean {
  switch (key) {
    case 'multipleMedia':
      return mediaChannel.allowMultipleMedia;
    case 'botsBypass':
      return mediaChannel.allowBotsBypass;
    case 'staffBypass':
      return mediaChannel.allowStaffBypass;
    case 'videos':
      return mediaChannel.allowVideos;
    case 'text':
      return mediaChannel.allowText;
  }
}

export function buildMediaChannelEditReply(mediaChannel: MediaChannel): {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
} {
  const channelId = mediaChannel.id.toString();

  const fmt = (label: string, value: boolean): string =>
    `**${label}:** ${value ? 'Enabled' : 'Disabled'}`;

  const embed = new EmbedBuilder()
    .setTitle('Media Channel Settings')
    .setDescription(
      [
        `Configuration for <#${channelId}>`,
        '',
        fmt('Allow Multiple Media Uploads', mediaChannel.allowMultipleMedia),
        fmt('Allow Bots to Bypass', mediaChannel.allowBotsBypass),
        fmt('Allow Staff to Bypass', mediaChannel.allowStaffBypass),
        fmt('Allow Videos', mediaChannel.allowVideos),
        fmt('Allow Text', mediaChannel.allowText),
      ].join('\n'),
    )
    .setColor(Colors.INVISIBLE);

  const toggleButton = (key: MediaChannelToggleKey): ButtonBuilder => {
    const enabled = getToggleValue(mediaChannel, key);
    return new ButtonBuilder()
      .setCustomId(`mediachannel-toggle:${key}:${channelId}`)
      .setLabel(TOGGLE_LABELS[key])
      .setStyle(enabled ? ButtonStyle.Success : ButtonStyle.Secondary);
  };

  const settingsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    toggleButton('multipleMedia'),
    toggleButton('botsBypass'),
    toggleButton('staffBypass'),
    toggleButton('videos'),
    toggleButton('text'),
  );

  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`mediachannel-delete:${channelId}`)
      .setLabel('Delete')
      .setStyle(ButtonStyle.Danger),
  );

  return {
    embeds: [embed],
    components: [settingsRow, actionRow],
  };
}
