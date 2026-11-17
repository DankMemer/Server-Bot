const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const { test } = require('node:test');
const {
  Collection,
  ComponentType,
  ContainerComponent,
  MessageComponentInteraction,
  MessageFlags,
  TextDisplayComponent,
} = require('discord.js');

// These tests do not load production credentials or connect to external services.
const configPath = require.resolve('../dist/config');
require.cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: { CONFIG: { ids: { servers: { dmc: 'dmc' } } } },
};
const loggerPath = require.resolve('../dist/lib/logger');
require.cache[loggerPath] = {
  id: loggerPath,
  filename: loggerPath,
  loaded: true,
  exports: { logger: { error() {} } },
};

const { NOTIFICATION_ROLE_GROUPS, isValidNotificationRoleSelection } = require('../dist/commands/roles/constants');
const { queueNotificationRoleUpdate } = require('../dist/commands/roles/queue');
const { buildNotificationRolesReply } = require('../dist/commands/roles/ui');
const { RolesCommand } = require('../dist/commands/roles/command');
const { NotificationRolesSelectComponent } = require('../dist/commands/roles/components/select');

const ids = group => group.roles.map(role => role.id);
const [news, events, server] = NOTIFICATION_ROLE_GROUPS;
let guildNumber = 0;

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function fakeGuild({ guildId = `guild-${++guildNumber}`, initial = {}, beforeChange } = {}) {
  const state = new Map(Object.entries(initial).map(([userId, roleIds]) => [userId, new Set(roleIds)]));
  const changes = [];
  const fetches = [];
  const cache = new Collection(NOTIFICATION_ROLE_GROUPS.flatMap(group => group.roles).map(role => [
    role.id,
    { id: role.id, name: `Live role ${role.id}`, editable: true },
  ]));
  const guild = {
    id: guildId,
    roles: { cache, async fetch() { return cache; } },
    members: {
      async fetch(options) {
        assert.equal(options.force, true, 'membership must be refreshed when the job starts');
        fetches.push(options.user);
        return member(options.user);
      },
      async fetchMe() { return {}; },
    },
  };

  function current(userId) {
    if (!state.has(userId)) state.set(userId, new Set());
    return state.get(userId);
  }

  function member(userId, snapshot = new Set(current(userId))) {
    async function change(action, roleId) {
      assert.equal(typeof roleId, 'string', 'never replace the full role list');
      const change = { action, roleId, userId };
      changes.push(change);
      if (beforeChange) await beforeChange(change, current(userId));
      const next = new Set(snapshot);
      if (action === 'add') {
        current(userId).add(roleId);
        next.add(roleId);
      } else {
        current(userId).delete(roleId);
        next.delete(roleId);
      }
      // discord.js returns a clone after a single-role PUT/DELETE, not the original member.
      return member(userId, next);
    }

    return {
      id: userId,
      guild,
      roles: {
        cache: new Collection([...snapshot].map(id => [id, cache.get(id) ?? { id, name: id }])),
        add: roleId => change('add', roleId),
        remove: roleId => change('remove', roleId),
      },
    };
  }

  return { guild, state, changes, fetches, current, member };
}

function serialize(reply) {
  return { ...reply, components: reply.components.map(component => component.toJSON()) };
}

function menus(reply) {
  return serialize(reply).components
    .filter(component => component.type === ComponentType.Container)
    .flatMap(container => container.components)
    .filter(component => component.type === ComponentType.ActionRow)
    .flatMap(row => row.components);
}

function selectInteraction(fake, { userId = 'user', ownerId = userId, group = news, selected = [], roleIds = ids(group) } = {}) {
  const calls = [];
  return {
    calls,
    guild: fake.guild,
    guildId: fake.guild.id,
    user: { id: userId },
    member: fake.member(userId),
    customId: `notification-roles:${ownerId}:${group.id}`,
    values: selected,
    component: { options: roleIds.map(value => ({ value })) },
    isStringSelectMenu: () => true,
    inCachedGuild: () => true,
    async reply(reply) { calls.push({ type: 'reply', reply }); },
    async update(reply) { calls.push({ type: 'update', reply }); },
    async editReply(reply) { calls.push({ type: 'edit', reply }); },
  };
}

test('menu preserves the requested group/role order and uses live names and selected membership', () => {
  const fake = fakeGuild({ initial: { user: [news.roles[1].id, server.roles[7].id] } });
  fake.guild.roles.cache.get(news.roles[0].id).name = 'A renamed notification role';
  const reply = buildNotificationRolesReply(fake.member('user'));
  const json = serialize(reply);

  assert.equal(reply.flags, MessageFlags.IsComponentsV2);
  assert.deepEqual(reply.allowedMentions, { parse: [] });
  assert.equal(json.components.length, 4);
  assert.deepEqual(menus(reply).map(menu => menu.options.map(option => option.value)), [
    ['1283084915579027468', '1161479598056419359', '929894637898973194'],
    ['1222600126673981560', '1222604489572483197', '1222604561215131658', '1222604999037550652'],
    ['754401757144285204', '754453793902690354', '754471933474766949', '754471991876124773',
      '1196949477517443153', '1445233032222081075', '1208225882427101256', '1342974397320794212'],
  ]);

  menus(reply).forEach((menu, index) => {
    const group = NOTIFICATION_ROLE_GROUPS[index];
    const heading = json.components[index + 1].components[0];
    assert.ok(heading.content.includes(group.title));
    assert.ok(heading.content.includes(group.description));
    assert.equal(menu.min_values, 0);
    assert.equal(menu.max_values, group.roles.length);
    assert.ok(menu.custom_id.includes(`:user:${group.id}`));
    menu.options.forEach(option => {
      assert.equal(option.label, fake.guild.roles.cache.get(option.value).name);
      assert.ok(option.description.length > 0 && option.description.length <= 100);
      assert.equal(option.default, fake.current('user').has(option.value));
    });
  });
});

test('missing/unmanageable roles are omitted, empty groups remain explained, and saving disables menus', () => {
  const fake = fakeGuild();
  fake.guild.roles.cache.delete(news.roles[0].id);
  fake.guild.roles.cache.get(news.roles[1].id).editable = false;
  ids(events).forEach(id => fake.guild.roles.cache.get(id).editable = false);
  const reply = buildNotificationRolesReply(fake.member('user'), 'Saving', true);
  const json = serialize(reply);

  assert.deepEqual(menus(reply)[0].options.map(option => option.value), [news.roles[2].id]);
  assert.equal(menus(reply).length, 2);
  assert.ok(menus(reply).every(menu => menu.disabled));
  assert.ok(json.components[1].components[0].content.includes('unavailable'));
  assert.ok(json.components[2].components[0].content.includes(events.title));
  assert.equal(json.components[2].components.length, 1);
});

test('the Discord library finds a dropdown nested in the new grouped layout', () => {
  const fake = fakeGuild();
  const reply = serialize(buildNotificationRolesReply(fake.member('user')));
  const parsed = reply.components.map(component => component.type === ComponentType.Container
    ? new ContainerComponent(component)
    : new TextDisplayComponent(component));
  const getComponent = Object.getOwnPropertyDescriptor(MessageComponentInteraction.prototype, 'component').get;
  const component = getComponent.call({ message: { components: parsed }, customId: `notification-roles:user:${server.id}` });

  assert.deepEqual(component.options.map(option => option.value), ids(server));
});

test('updates only differences in the selected group and preserves concurrently assigned unrelated roles', async () => {
  const fake = fakeGuild({
    initial: { user: [news.roles[0].id, events.roles[0].id, 'staff-role'] },
    beforeChange(change, state) { state.add('new-level-role'); },
  });
  const result = await queueNotificationRoleUpdate(fake.guild, 'user', news.id, ids(news), [news.roles[1].id]);

  assert.deepEqual(result.added, [news.roles[1].id]);
  assert.deepEqual(result.removed, [news.roles[0].id]);
  assert.deepEqual(result.failed, []);
  assert.deepEqual(fake.current('user'), new Set([events.roles[0].id, 'staff-role', 'new-level-role', news.roles[1].id]));
  assert.ok(result.member.roles.cache.has(news.roles[1].id));
  assert.ok(!result.member.roles.cache.has(news.roles[0].id));

  const again = await queueNotificationRoleUpdate(fake.guild, 'user', news.id, ids(news), [news.roles[1].id]);
  assert.equal(fake.changes.length, 2, 'submitting unchanged roles should not make write requests');
  assert.deepEqual(again.added, []);
  assert.deepEqual(again.removed, []);
});

test('clearing a dropdown removes all shown roles and preserves omitted roles and other groups', async () => {
  const fake = fakeGuild({ initial: { user: [...ids(news), events.roles[0].id] } });
  fake.guild.roles.cache.get(news.roles[0].id).editable = false;
  const shown = ids(news).slice(1);
  await queueNotificationRoleUpdate(fake.guild, 'user', news.id, shown, []);
  assert.deepEqual(fake.current('user'), new Set([news.roles[0].id, events.roles[0].id]));
});

test('invalid and forged selections are rejected before any membership requests', async () => {
  const fake = fakeGuild();
  const cases = [
    ['unknown', ids(news), []],
    [news.id, [], []],
    [news.id, ['arbitrary-role'], ['arbitrary-role']],
    [news.id, ids(news), [events.roles[0].id]],
    [news.id, [news.roles[0].id], [news.roles[1].id]],
    [news.id, [news.roles[0].id, news.roles[0].id], []],
    [news.id, ids(news), [news.roles[0].id, news.roles[0].id]],
  ];
  for (const [group, shown, selected] of cases) {
    assert.equal(isValidNotificationRoleSelection(group, shown, selected), false);
    await assert.rejects(queueNotificationRoleUpdate(fake.guild, 'user', group, shown, selected), /Invalid/);
  }
  assert.equal(fake.fetches.length, 0);
  assert.equal(fake.changes.length, 0);
});

test('a guild processes changes serially and combines pending selections into the latest one', async () => {
  const entered = deferred();
  const release = deferred();
  const fake = fakeGuild({
    async beforeChange(change) {
      if (change.userId === 'blocker') {
        entered.resolve();
        await release.promise;
      }
    },
  });
  const blocker = queueNotificationRoleUpdate(fake.guild, 'blocker', news.id, ids(news), [news.roles[0].id]);
  await entered.promise;
  const first = queueNotificationRoleUpdate(fake.guild, 'user', server.id, ids(server), [server.roles[0].id]);
  const otherGroup = queueNotificationRoleUpdate(fake.guild, 'user', events.id, ids(events), [events.roles[0].id]);
  const latest = queueNotificationRoleUpdate(fake.guild, 'user', server.id, ids(server), [server.roles[1].id]);

  assert.equal(first, latest, 'pending edits to a group share one job');
  assert.deepEqual(fake.fetches, ['blocker'], 'waiting jobs must not read stale membership');
  assert.equal(fake.changes.length, 1);
  release.resolve();
  await Promise.all([blocker, first, latest, otherGroup]);
  assert.deepEqual(fake.current('user'), new Set([server.roles[1].id, events.roles[0].id]));
  assert.deepEqual(fake.changes.map(change => change.roleId), [news.roles[0].id, server.roles[1].id, events.roles[0].id]);
});

test('an edit arriving during an active update runs afterward using fresh membership', async () => {
  const entered = deferred();
  const release = deferred();
  let first = true;
  const fake = fakeGuild({ async beforeChange() {
    if (first) {
      first = false;
      entered.resolve();
      await release.promise;
    }
  } });
  const adding = queueNotificationRoleUpdate(fake.guild, 'user', news.id, ids(news), [news.roles[0].id]);
  await entered.promise;
  const removing = queueNotificationRoleUpdate(fake.guild, 'user', news.id, ids(news), []);
  release.resolve();
  await Promise.all([adding, removing]);

  assert.deepEqual(fake.changes.map(change => change.action), ['add', 'remove']);
  assert.equal(fake.current('user').size, 0);
});

test('different guilds can process their queues independently', async () => {
  const entered = deferred();
  const release = deferred();
  const first = fakeGuild({ async beforeChange() { entered.resolve(); await release.promise; } });
  const second = fakeGuild();
  const blocked = queueNotificationRoleUpdate(first.guild, 'user', news.id, ids(news), [news.roles[0].id]);
  await entered.promise;
  try {
    await queueNotificationRoleUpdate(second.guild, 'user', news.id, ids(news), [news.roles[0].id]);
    assert.ok(second.current('user').has(news.roles[0].id));
  } finally {
    release.resolve();
    await blocked;
  }
});

test('partial API failures and role hierarchy changes show actual results without blocking later updates', async () => {
  let fail = true;
  const fake = fakeGuild({ beforeChange(change) {
    if (fail && change.roleId === news.roles[0].id) throw new Error('Discord request failed');
  } });
  fake.guild.roles.cache.get(news.roles[2].id).editable = false;
  const result = await queueNotificationRoleUpdate(fake.guild, 'user', news.id, ids(news), ids(news));

  assert.deepEqual(result.failed, [news.roles[0].id, news.roles[2].id]);
  assert.deepEqual(result.added, [news.roles[1].id]);
  assert.deepEqual([...result.member.roles.cache.keys()], [news.roles[1].id]);
  fail = false;
  const next = await queueNotificationRoleUpdate(fake.guild, 'user', news.id, ids(news), [news.roles[0].id]);
  assert.deepEqual(next.failed, []);
  assert.deepEqual(fake.current('user'), new Set([news.roles[0].id]));
});

test('a failed member fetch does not poison the guild queue', async () => {
  const fake = fakeGuild();
  const fetch = fake.guild.members.fetch;
  let fail = true;
  fake.guild.members.fetch = async options => {
    if (fail) { fail = false; throw new Error('Member fetch failed'); }
    return fetch(options);
  };
  const failed = queueNotificationRoleUpdate(fake.guild, 'user', news.id, ids(news), [news.roles[0].id]);
  const next = queueNotificationRoleUpdate(fake.guild, 'other-user', news.id, ids(news), [news.roles[1].id]);

  await assert.rejects(failed, /Member fetch failed/);
  await next;
  assert.deepEqual(fake.current('other-user'), new Set([news.roles[1].id]));
});

test('overdue queued updates expire without changing roles and the queue recovers', async () => {
  const entered = deferred();
  const release = deferred();
  const fake = fakeGuild({ async beforeChange(change) {
    if (change.userId === 'blocker') { entered.resolve(); await release.promise; }
  } });
  const blocker = queueNotificationRoleUpdate(fake.guild, 'blocker', news.id, ids(news), [news.roles[0].id]);
  await entered.promise;
  const overdue = queueNotificationRoleUpdate(fake.guild, 'user', news.id, ids(news), [news.roles[0].id]);
  const originalNow = Date.now;
  const future = Date.now() + 10 * 60 * 1000 + 1;
  try {
    Date.now = () => future;
    release.resolve();
    await blocker;
    await assert.rejects(overdue, /expired/);
  } finally {
    Date.now = originalNow;
    release.resolve();
  }
  assert.equal(fake.current('user').size, 0);
  await queueNotificationRoleUpdate(fake.guild, 'user', news.id, ids(news), [news.roles[0].id]);
  assert.ok(fake.current('user').has(news.roles[0].id));
});

test('/roles is public, DMC-only, and defers privately before fetching membership', async () => {
  const command = new RolesCommand();
  const definition = command.data.toJSON();
  assert.equal(definition.name, 'roles');
  assert.equal(definition.description, 'Manage your notification roles in one menu');
  assert.equal(definition.default_member_permissions, undefined);
  assert.equal(definition.dm_permission, false);
  assert.deepEqual(command.servers, ['dmc']);
  const fake = fakeGuild({ guildId: 'dmc' });
  const calls = [];
  await command.execute({ interaction: {
    guild: fake.guild,
    guildId: 'dmc',
    user: { id: 'ordinary-member' },
    inCachedGuild: () => true,
    async deferReply(reply) { assert.equal(fake.fetches.length, 0); calls.push({ type: 'defer', reply }); },
    async editReply(reply) { calls.push({ type: 'edit', reply }); },
  } });

  assert.deepEqual(calls[0], { type: 'defer', reply: { ephemeral: true } });
  assert.equal(menus(calls[1].reply).length, 3);
});

test('the component rejects other owners, other guilds, and options outside the displayed group', async () => {
  const fake = fakeGuild({ guildId: 'dmc' });
  const component = new NotificationRolesSelectComponent();
  const cases = [
    selectInteraction(fake, { ownerId: 'another-user' }),
    selectInteraction(fake, { selected: [news.roles[1].id], roleIds: [news.roles[0].id] }),
    selectInteraction(fake, { roleIds: [server.roles[0].id] }),
    selectInteraction(fakeGuild({ guildId: 'another-guild' })),
  ];
  for (const interaction of cases) {
    await component.execute({ interaction });
    assert.equal(interaction.calls.length, 1);
    assert.equal(interaction.calls[0].type, 'reply');
    assert.equal(interaction.calls[0].reply.ephemeral, true);
  }
  assert.equal(fake.fetches.length, 0);
  assert.equal(fake.changes.length, 0);
});

test('the component acknowledges with disabled controls before writing and refreshes checkmarks afterward', async () => {
  let interaction;
  const fake = fakeGuild({ guildId: 'dmc', beforeChange() {
    assert.equal(interaction.calls[0].type, 'update');
    assert.ok(menus(interaction.calls[0].reply).every(menu => menu.disabled));
  } });
  interaction = selectInteraction(fake, { selected: [news.roles[0].id, news.roles[1].id] });
  await new NotificationRolesSelectComponent().execute({ interaction });

  assert.deepEqual(interaction.calls.map(call => call.type), ['update', 'edit']);
  const final = interaction.calls[1].reply;
  assert.ok(menus(final).every(menu => !menu.disabled));
  assert.deepEqual(menus(final)[0].options.filter(option => option.default).map(option => option.value), ids(news).slice(0, 2));
  assert.ok(serialize(final).components[0].content.includes('saved'));
});

test('the component reports partial failure with correct checkmarks and a fatal fetch error with a fresh-menu prompt', async () => {
  const component = new NotificationRolesSelectComponent();
  const fake = fakeGuild({ guildId: 'dmc', beforeChange(change) {
    if (change.roleId === news.roles[0].id) throw new Error('Forbidden');
  } });
  const partial = selectInteraction(fake, { selected: [news.roles[0].id, news.roles[1].id] });
  await component.execute({ interaction: partial });
  const final = partial.calls[1].reply;
  assert.ok(serialize(final).components[0].content.includes('Some changes could not be saved'));
  assert.deepEqual(menus(final)[0].options.filter(option => option.default).map(option => option.value), [news.roles[1].id]);

  fake.guild.members.fetch = async () => { throw new Error('Temporary outage'); };
  const fatal = selectInteraction(fake, { selected: [] });
  await component.execute({ interaction: fatal });
  const errorReply = fatal.calls[1].reply;
  assert.ok(serialize(errorReply).components[0].content.includes('run /roles again'));
  assert.ok(menus(errorReply).every(menu => menu.disabled));
});

test('the production command loader discovers /roles and every command definition serializes after the library update', () => {
  const result = spawnSync(process.execPath, ['-e', `
    const assert = require('node:assert/strict');
    const { readFileSync } = require('node:fs');
    const source = readFileSync('src/config.ts', 'utf8');
    for (const [, name, type] of source.matchAll(/variable\\('([^']+)', '([^']+)'/g)) {
      process.env[name] = type === 'number' ? '1' : 'test';
    }
    process.env.IDS_SERVERS_DMC = '123456789012345670';
    process.env.IDS_SERVERS_DMO = '123456789012345671';
    process.env.IDS_SERVERS_DMS = '123456789012345672';
    process.env.REDIS_URL = 'redis://127.0.0.1:1';
    process.env.PRISMA_DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/test';
    process.env.MEMER_API_URL = 'http://127.0.0.1:1';
    const { REST } = require('discord.js');
    REST.prototype.request = () => { throw new Error('Tests must not call Discord'); };
    const { Commands, Components } = require('./dist/commands');
    const { CONFIG } = require('./dist/config');
    assert.ok(Commands.has('roles'));
    assert.ok(Components.has('notification-roles'));
    for (const command of Commands.values()) command.data.toJSON();
    for (const server of Object.values(CONFIG.ids.servers)) {
      const definitions = [...Commands.values()]
        .filter(command => command.servers.includes(server))
        .map(command => command.data.toJSON());
      assert.equal(definitions.some(command => command.name === 'roles'), server === CONFIG.ids.servers.dmc);
    }
  `], { cwd: resolve(__dirname, '..'), encoding: 'utf8', timeout: 20000 });

  assert.equal(result.status, 0, result.error?.message ?? result.stderr + result.stdout);
});
