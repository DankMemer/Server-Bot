import decancer from 'decancer';

function cleanName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '');  // Remove all non-alphanumeric characters
}

export function decancerString(input: string): string {
  return cleanName(decancer(input).toString());
}
