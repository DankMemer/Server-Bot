import { Guild, GuildMember, MessageMentions } from 'discord.js';

/**
 * Parse a list of users and resolve to guild members
 * Supports: user IDs, mentions, multiple separators (space, comma, semicolon)
 * Throws Error if any user cannot be resolved
 */
export async function parseUsers(input: string, guild: Guild): Promise<GuildMember[]> {
  const userInputs = input
    .split(/[,;\s]+/)
    .map(u => u.trim())
    .filter(u => u.length > 0);

  const members: GuildMember[] = [];

  for (const userInput of userInputs) {
    const member = await parseUserInput(userInput, guild);
    members.push(member);
  }

  return members;
}

async function getMemberFromMention(mention: string, guild: Guild): Promise<GuildMember | null> {
  const matches = mention.match(MessageMentions.UsersPattern);
  if (!matches) {
    return null;
  }

  const userId = matches.groups.id;
  if (!userId) {
    return null;
  }

  return await guild.members.fetch(userId) || null;
}

function isMention(mention: string): boolean {
  return MessageMentions.UsersPattern.test(mention);
}

async function parseUserInput(input: string, guild: Guild): Promise<GuildMember> {
  const trimmed = input.trim();

  if (isMention(trimmed)) {
    const member = await getMemberFromMention(trimmed, guild);
    if (!member) {
      throw new Error(`Invalid user mention: ${trimmed}`);
    }

    return member;
  }

  const member = await guild.members.fetch(trimmed);
  if (!member) {
    throw new Error(`User ID not found: ${trimmed}`);
  }

  return member;
}
