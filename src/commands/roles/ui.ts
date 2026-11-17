import { APIMessageTopLevelComponent, GuildMember, MessageFlags } from 'discord.js';
import { container, resolveDisUI, row, select, text, ui } from 'disui';
import { NOTIFICATION_ROLE_COMPONENT_ID, NOTIFICATION_ROLE_GROUPS } from './constants';

export function buildNotificationRolesReply(member: GuildMember, status = '', disabled = false): {
  flags: MessageFlags.IsComponentsV2;
  components: APIMessageTopLevelComponent[];
  allowedMentions: { parse: [] };
} {
  const groups = NOTIFICATION_ROLE_GROUPS.map(group => {
    const roles = group.roles.filter(role => member.guild.roles.cache.get(role.id)?.editable);
    const unavailable = roles.length < group.roles.length
      ? 'Some roles are currently unavailable. Please contact staff if a role you want is missing.'
      : '';

    return container(
      text(text(group.title).size('h3'), group.description, unavailable),
      roles.length > 0
        ? row(
          select(`${NOTIFICATION_ROLE_COMPONENT_ID}:${member.id}:${group.id}`)
            .placeholder(group.title)
            .min(0)
            .max(roles.length)
            .setOptions(roles.map(role => ({
              label: member.guild.roles.cache.get(role.id).name,
              value: role.id,
              description: role.description,
              default: member.roles.cache.has(role.id),
            }))),
        )
        : null,
    ).disabled(disabled);
  });

  const { data } = resolveDisUI(ui(
    text(
      text('Notification Roles').size('h2'),
      'Select the roles you want in each group. Unselect a role to turn off its pings. Each dropdown saves automatically; you can also clear a group to turn all of its pings off.',
      status,
    ).join('\n\n'),
    ...groups,
  ).mentions('users', false));

  return {
    flags: MessageFlags.IsComponentsV2,
    // DisUI types its output as any message component; this UI only renders
    // top-level text and containers. discord.js sends these resolved API objects.
    components: data.components as APIMessageTopLevelComponent[],
    allowedMentions: { parse: [] },
  };
}
