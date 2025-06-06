export function getRequiredXP(level: number): number {
  if (level === 0) {
    return 0;
  }

  let xp = 55;

  for (let i = 1; i <= level; i++) {
    xp += 35 + (i * 10);
  }

  return xp;
}

export function getLevel(xp: number | bigint): number {
  let level = -1;
  let totalRequired = getRequiredXP(0);

  while (xp >= (getRequiredXP(level + 1) + totalRequired)) {
    level++;
    totalRequired += getRequiredXP(level);
  }

  return level;
}
