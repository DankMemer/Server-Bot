import { GuildMember } from 'discord.js';
import { memerClient } from '../../lib/memer-client';
import { sendMemberLeaveLog } from '../../utils/member-log';

export default async function guildMemberRemove(member: GuildMember): Promise<void> {
  const memerUser = await memerClient.getUser(member.id);

  await sendMemberLeaveLog(member, memerUser);
}
