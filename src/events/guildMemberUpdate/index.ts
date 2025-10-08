import { GuildMember } from 'discord.js';
import { enforceFrozenNickname } from './frozen-nickname';

export default async function guildMemberUpdate(_oldMember: GuildMember, newMember: GuildMember): Promise<void> {
  await enforceFrozenNickname(newMember);
}
