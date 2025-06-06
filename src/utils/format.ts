import { EmbedBuilder } from 'discord.js';
import { Colors } from '../constants/colors';

export const toTitleCase = (text: string, allWords: boolean = false): string =>
  allWords
    ? text.split(/\s+/g).map(v => toTitleCase(v, false)).join(' ')
    : text[0].toUpperCase() + text.slice(1);

export const ephemeralResponse = (description: string): { ephemeral: boolean; embeds: [EmbedBuilder] } => ({
  ephemeral: true,
  embeds: [
    new EmbedBuilder({
      description,
      color: Colors.INVISIBLE,
    }),
  ],
});

export function truncate(text: string, size: number): string {
  return text.length > size ? text.slice(0, size - 1) + '…' : text;
}
