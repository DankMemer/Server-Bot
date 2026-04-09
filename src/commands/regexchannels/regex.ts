export type ParsedRegex = {
  pattern: string;
  flags: string;
};

/**
 * Parses a user-supplied regex string. Accepts either a raw pattern
 * (e.g. `^hello$`) or a JS-style literal (e.g. `/^hello$/i`).
 * Returns null if the result is not a valid RegExp.
 */
export function parseRegex(input: string): ParsedRegex | null {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.startsWith('/')) {
    const lastSlash = trimmed.lastIndexOf('/');
    if (lastSlash > 0) {
      const pattern = trimmed.slice(1, lastSlash);
      const flags = trimmed.slice(lastSlash + 1);
      try {
        new RegExp(pattern, flags);
        return { pattern, flags };
      } catch {
        return null;
      }
    }
  }

  try {
    new RegExp(trimmed);
    return { pattern: trimmed, flags: '' };
  } catch {
    return null;
  }
}

export function formatRegex(pattern: string, flags: string): string {
  return `/${pattern}/${flags}`;
}

export function tryBuildRegExp(pattern: string, flags: string): RegExp | null {
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}
