export function randomNumber(min: number, max: number): number {
  return Math.floor((Math.random() * (max - min + 1)) + min);
}

const numberFormat = Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function abbreviate(value: number | bigint): string {
  return numberFormat.format(value);
}
