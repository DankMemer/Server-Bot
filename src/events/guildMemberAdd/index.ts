import { GuildMember } from 'discord.js';
import { memerClient } from '../../lib/memer-client';
import { sendMemberJoinLog } from '../../utils/member-log';
import { enforceFrozenNickname } from '../guildMemberUpdate/frozen-nickname';
import { enforceBan, enforceNoDankCommands, enforceNoNewAccounts } from './auto-kick';
import { assignDefaultNotificationRole } from './default-role';

export default async function guildMemberAdd(member: GuildMember): Promise<void> {
  const userLookup = await memerClient.getUser(member.id);

  await sendMemberJoinLog(member, userLookup);

  if (await enforceNoNewAccounts(member)) {
    return;
  }

  if (await enforceNoDankCommands(member, userLookup)) {
    return;
  }

  if (await enforceBan(member, userLookup)) {
    return;
  }

  await assignDefaultNotificationRole(member);
  await enforceFrozenNickname(member);
}
