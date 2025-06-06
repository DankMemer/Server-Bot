import { Emojis } from '../constants/emojis';

export namespace Widget {
  export function list(items: string[]): string {
    return items
      .filter(item => item !== null)
      .map(i => `\` - \` ${i}`)
      .join('\n');
  }

  export function monospaceList(items: Array<[number | string | bigint, string]>): string {
    const longest = Math.max(...items.map(([ value ]) => value.toLocaleString().length));

    return items
      .filter(item => item !== null)
      .map(([ value, name ]) =>
        `\` ${' '.repeat(longest - value.toLocaleString().length)}${value.toLocaleString()} \` ${name}`,
      )
      .join('\n');
  }

  export function replyList(items: string[]): string {
    const filtered = items.filter(item => item !== null);

    return filtered
      .reduce((result, item, i) => {
        const emoji = i < (filtered.length - 1)
          ? Emojis.replyContinue
          : Emojis.reply;
        const newLine = i !== 0 ? '\n' : '';

        return result + `${newLine}${emoji} ` + item;
      }, '');
  }
}
