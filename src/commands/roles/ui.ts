import { ActionRowBuilder, ContainerBuilder, GuildMember, MessageFlags, StringSelectMenuBuilder, TextDisplayBuilder } from 'discord.js';
import { NOTIFICATION_ROLE_COMPONENT_ID, NOTIFICATION_ROLE_GROUPS } from './constants';

export function buildNotificationRolesReply(member: GuildMember, status = '', disabled = false): {
  flags: MessageFlags.IsComponentsV2;
  components: Array<TextDisplayBuilder | ContainerBuilder>;
  allowedMentions: { parse: [] };
} {
  const components: Array<TextDisplayBuilder | ContainerBuilder> = [
    new TextDisplayBuilder().setContent([
      '## Notification Roles',
      'Select the roles you want in each group. Unselect a role to turn off its pings. Each dropdown saves automatically; you can also clear a group to turn all of its pings off.',
      status,
    ].filter(Boolean).join('\n\n')),
  ];

  for (const group of NOTIFICATION_ROLE_GROUPS) {
    const roles = group.roles.filter(role => member.guild.roles.cache.get(role.id)?.editable);
    const unavailable = roles.length < group.roles.length
      ? '\nSome roles are currently unavailable. Please contact staff if a role you want is missing.'
      : '';
    const container = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### ${group.title}\n${group.description}${unavailable}`),
    );

    if (roles.length > 0) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`${NOTIFICATION_ROLE_COMPONENT_ID}:${member.id}:${group.id}`)
            .setPlaceholder(group.title)
            .setMinValues(0)
            .setMaxValues(roles.length)
            .setDisabled(disabled)
            .addOptions(roles.map(role => ({
              label: member.guild.roles.cache.get(role.id).name,
              value: role.id,
              description: role.description,
              default: member.roles.cache.has(role.id),
            }))),
        ),
      );
    }

    components.push(container);
  }

  return { flags: MessageFlags.IsComponentsV2, components, allowedMentions: { parse: [] } };
}
