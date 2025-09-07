import { GuildMember } from 'discord.js';
import { enforceFrozenNickname } from '../guildMemberUpdate/frozen-nickname';
import { enforceBan, enforceNotNewAccounts } from './auto-kick';

export default async function guildMemberAdd(member: GuildMember): Promise<void> {
  await enforceNotNewAccounts(member);
  await enforceBan(member);
  await enforceFrozenNickname(member);
}
