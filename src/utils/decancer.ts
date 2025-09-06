import decancer from 'decancer';

function cleanName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s/g, '-');
}

export function decancerString(input: string): string {
  return cleanName(decancer(input).toString());
}
