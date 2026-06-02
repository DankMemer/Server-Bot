import { GuildMember } from 'discord.js';
import { sendMemberLeaveLog } from '../../utils/member-log';

export default async function guildMemberRemove(member: GuildMember): Promise<void> {
  await sendMemberLeaveLog(member);
}
