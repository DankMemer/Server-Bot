import { GuildMember } from 'discord.js';
import { memerClient } from '../../lib/memer-client';
import { sendMemberJoinLog } from '../../utils/member-log';
import { enforceFrozenNickname } from '../guildMemberUpdate/frozen-nickname';
import { enforceBan, enforceNoDankCommands, enforceNoNewAccounts } from './auto-kick';

export default async function guildMemberAdd(member: GuildMember): Promise<void> {
  const memerUser = await memerClient.getUser(member.id);

  await sendMemberJoinLog(member, memerUser);

  if (await enforceNoNewAccounts(member)) {
    return;
  }

  if (await enforceNoDankCommands(member, memerUser)) {
    return;
  }

  if (await enforceBan(member, memerUser)) {
    return;
  }

  await enforceFrozenNickname(member);
}
