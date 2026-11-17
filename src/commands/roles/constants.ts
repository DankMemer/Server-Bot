export type NotificationRoleGroup = {
  id: string;
  title: string;
  description: string;
  roles: Array<{ id: string; description: string }>;
};

export const NOTIFICATION_ROLE_COMPONENT_ID = 'notification-roles';

export const NOTIFICATION_ROLE_GROUPS: NotificationRoleGroup[] = [
  {
    id: 'dank-memer',
    title: 'Dank Memer Roles',
    description: 'Choose which Dank Memer news, sneak peeks, and votes you want to hear about.',
    roles: [
      { id: '1283084915579027468', description: 'Get pinged for important Dank Memer news and new updates.' },
      { id: '1161479598056419359', description: 'Get pinged for sneak peeks of upcoming Dank Memer changes before they are ready.' },
      { id: '929894637898973194', description: 'Get pinged when there is something to vote on in the voting channel.' },
    ],
  },
  {
    id: 'bot-events',
    title: 'Bot Event Roles',
    description: 'Choose which in-bot events you want to be notified about.',
    roles: [
      { id: '1222600126673981560', description: 'Get pinged when a new fishing event starts.' },
      { id: '1222604489572483197', description: 'Get pinged when a new grinding event starts.' },
      { id: '1222604561215131658', description: 'Get pinged when drops are about to happen.' },
      { id: '1222604999037550652', description: 'Get pinged when a World Bosses event starts (not implemented yet).' },
    ],
  },
  {
    id: 'server',
    title: 'Server Roles',
    description: 'Choose which server announcements, giveaways, and community events you want pings for.',
    roles: [
      { id: '754401757144285204', description: 'Get pinged for server changes announced by the admin team.' },
      { id: '754453793902690354', description: 'Get pinged when giveaways start.' },
      { id: '754471933474766949', description: 'Get pinged when heists start.' },
      { id: '754471991876124773', description: 'Get pinged when events start.' },
      { id: '1196949477517443153', description: 'Get pinged when mini-events start.' },
      { id: '1445233032222081075', description: 'Get pinged when raffles start.' },
      { id: '1208225882427101256', description: 'Get pinged when rumbles start.' },
      { id: '1342974397320794212', description: 'Get pinged for frequent rumbles or rumbles with lower rewards.' },
    ],
  },
];

export function isValidNotificationRoleSelection(
  groupId: string,
  roleIds: readonly string[],
  selectedRoleIds: readonly string[],
): boolean {
  const group = NOTIFICATION_ROLE_GROUPS.find(candidate => candidate.id === groupId);

  return Boolean(group)
    && roleIds.length > 0
    && new Set(roleIds).size === roleIds.length
    && roleIds.every(id => group.roles.some(role => role.id === id))
    && new Set(selectedRoleIds).size === selectedRoleIds.length
    && selectedRoleIds.every(id => roleIds.includes(id));
}
