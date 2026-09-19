import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageCreateOptions,
} from 'discord.js';
import { Colors } from '../../constants/colors';

export const NEW_PLAYER_HELP_CHANNEL_ID = '1404857819622019184';
export const SUPPORT_CHANNEL_ID = '491466924799164426';
export const SUPPORT_LOG_CHANNEL_ID = '1170347625069957201';
export const SUPPORT_BLOCKED_ROLE_ID = '1303081410680061963';
export const SUPPORT_COOLDOWN_SECONDS = 5 * 60;
export const SUPPORT_COOLDOWN_KEY_PREFIX = 'support-cooldown';

const SUPPORT_MESSAGE =
  'a support staff member will be with you as soon as one is available. Please hold tight.\n\n' +
  'If you haven\'t already, please explain the issue you\'re having in detail so we can help you as efficiently as possible.';

export function supportCooldownKey(userID: string): string {
  return `${SUPPORT_COOLDOWN_KEY_PREFIX}:${userID}`;
}

export function buildSupportMessage(userID: string, includeNevermind = false): MessageCreateOptions {
  const nevermindText = includeNevermind
    ? '\n\nIf you no longer need help, hit the "Nevermind" button below'
    : '';
  const components: ActionRowBuilder<ButtonBuilder>[] = [];

  if (includeNevermind) {
    components.push(
      new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`helpdesk-nevermind:${userID}`)
            .setLabel('Nevermind')
            .setStyle(ButtonStyle.Secondary),
        ),
    );
  }

  return {
    content: `<@${userID}>`,
    allowedMentions: { users: [ userID ] },
    embeds: [
      new EmbedBuilder()
        .setDescription(`Hey, <@${userID}>, ${SUPPORT_MESSAGE}${nevermindText}`)
        .setColor(Colors.INVISIBLE),
    ],
    components,
  };
}
