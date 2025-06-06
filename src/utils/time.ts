import HolyTime from 'holy-time';
import ms from 'ms';
import { ValueOf } from 'type-fest';

export function parseDuration(input: string): number | null {
  let temporary = '';
  let sum = 0;

  const occurrences = {
    d: 0,
    h: 0,
    m: 0,
    s: 0,
    y: 0,
  };

  for (const c of input) {
    if (!Object.keys(occurrences).includes(c)) {
      temporary += c;
      continue;
    }

    occurrences[c]++;
    sum += ms((temporary + c).trim());
    temporary = '';
  }

  const repeats = Object.values(occurrences).some((o) => o > 1);

  if (temporary !== '' || Number.isNaN(sum) || repeats) {
    return null;
  }

  return sum;
}

export const DiscordTimestampFormat = {
  /**
   * example: 16:20
   */
  SHORT_TIME: 't',
  /**
   * example: 16:20:30
   */
  LONG_TIME: 'T',
  /**
   * example: 20/04/2021
   */
  SHORT_DATE: 'd',
  /**
   * example: 20 April 2021
   */
  LONG_DATE: 'D',
  /**
   * example: 20 April 2021 16:20
   */
  SHORT_DATE_TIME: 'f',
  /**
   * example: Tuesday, 20 April 2021 16:20
   */
  LONG_DATE_TIME: 'F',
  /**
   * example: 2 months ago
   */
  RELATIVE_TIME: 'R',

} as const;

export function formatDiscordTimestamp(time: HolyTime, format: ValueOf<typeof DiscordTimestampFormat>): string {
  return `<t:${Math.floor(time.getTime() / 1000)}:${format}>`;
}
