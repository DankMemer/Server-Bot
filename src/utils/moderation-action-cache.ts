export type ModerationActionType = 'BAN' | 'UNBAN' | 'KICK';

const TTL_MS = 30_000;

const inFlightActions = new Set<string>();

function buildKey(guildID: string, userID: string, type: ModerationActionType): string {
  return `${guildID}:${userID}:${type}`;
}

export function markActionInFlight(guildID: string, userID: string, type: ModerationActionType): void {
  const key = buildKey(guildID, userID, type);
  inFlightActions.add(key);
  setTimeout(() => {
    inFlightActions.delete(key);
  }, TTL_MS).unref?.();
}

export function consumeActionInFlight(guildID: string, userID: string, type: ModerationActionType): boolean {
  const key = buildKey(guildID, userID, type);
  if (inFlightActions.has(key)) {
    inFlightActions.delete(key);
    return true;
  }
  return false;
}
