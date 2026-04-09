import { LockdownChannel } from '@prisma/client';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, GuildChannel, SlashCommandBuilder } from 'discord.js';
import { CONFIG } from '../../config';
import { Colors } from '../../constants/colors';
import { prismaClient } from '../../lib/prisma-client';
import { Command, CommandContext } from '../../structures/command';
import { canManageLockdown } from '../../utils/moderation';
import { groupRulesByRole, isVoiceChannel, lockRuleGroup, PERMISSION_CHOICES, tokenLabel, unlockRuleGroup } from './perms';

function normalizeRoleID(roleId: string | null, guildId: string): bigint | null {
  if (!roleId) return null;
  if (roleId === guildId) return null;
  return BigInt(roleId);
}

function describeRule(rule: LockdownChannel): string {
  const role = rule.roleID ? `<@&${rule.roleID}>` : '@everyone';
  return `${role} — ${tokenLabel(rule.permission)}${rule.locked ? ' [locked]' : ''}`;
}

export class LockdownCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Manage server lockdown')
    .addSubcommand(option =>
      option
        .setName('add')
        .setDescription('Add a channel rule to the lockdown system')
        .addChannelOption(subOption =>
          subOption
            .setName('channel')
            .setDescription('Channel to add')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildForum)
            .setRequired(true),
        )
        .addRoleOption(subOption =>
          subOption
            .setName('role')
            .setDescription('Role to lock (default: @everyone)')
            .setRequired(false),
        )
        .addStringOption(subOption =>
          subOption
            .setName('permission')
            .setDescription('Permission to deny (default: send messages / connect)')
            .addChoices(...PERMISSION_CHOICES)
            .setRequired(false),
        ),
    )
    .addSubcommand(option =>
      option
        .setName('remove')
        .setDescription('Remove channel rules from the lockdown system')
        .addChannelOption(subOption =>
          subOption
            .setName('channel')
            .setDescription('Channel to remove')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildForum)
            .setRequired(true),
        )
        .addRoleOption(subOption =>
          subOption
            .setName('role')
            .setDescription('Role filter (default: all roles for this channel)')
            .setRequired(false),
        )
        .addStringOption(subOption =>
          subOption
            .setName('permission')
            .setDescription('Permission filter (default: all permissions for this rule)')
            .addChoices(...PERMISSION_CHOICES)
            .setRequired(false),
        ),
    )
    .addSubcommand(option =>
      option
        .setName('list')
        .setDescription('List channels in lockdown system'),
    )
    .addSubcommand(option =>
      option
        .setName('channel')
        .setDescription('Toggle channel lockdown')
        .addChannelOption(subOption =>
          subOption
            .setName('channel')
            .setDescription('Channel to toggle')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildForum)
            .setRequired(true),
        ),
    )
    .addSubcommand(option =>
      option
        .setName('server')
        .setDescription('Toggle server lockdown'),
    )
    .addSubcommand(option =>
      option
        .setName('prune')
        .setDescription('Remove invalid channel/role entries from lockdown system'),
    );

  public override servers = [CONFIG.ids.servers.dmc, CONFIG.ids.servers.dmo];

  public override execute = async ({ interaction, userEntry }: CommandContext): Promise<void | string | EmbedBuilder> => {
    const moderatorMember = interaction.guild.members.resolve(interaction.user.id);

    if (!moderatorMember) {
      return 'Could not find your member record.';
    }

    if (!canManageLockdown(moderatorMember)) {
      return new EmbedBuilder()
        .setDescription('You do not have permission to manage lockdown. You need Administrator permissions, Manage Server permissions, or the Server Manager role.')
        .setColor(Colors.RED);
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'add': {
        const channel = interaction.options.getChannel('channel', true);
        const role = interaction.options.getRole('role', false);
        const permission = interaction.options.getString('permission', false);

        const discordChannel = interaction.guild.channels.resolve(channel.id) as GuildChannel | null;
        if (!discordChannel) {
          return 'Could not resolve channel.';
        }

        if (isVoiceChannel(discordChannel) && permission) {
          return 'Voice channels do not support per-permission rules. Omit the `permission` option for voice channels.';
        }

        const roleID = normalizeRoleID(role?.id ?? null, interaction.guild.id);

        const existing = await prismaClient.lockdownChannel.findFirst({
          where: {
            channelID: BigInt(channel.id),
            roleID,
            permission,
          },
        });

        if (existing) {
          return `That rule already exists for <#${channel.id}>. Use \`/lockdown remove\` first.`;
        }

        const lockedSiblings = await prismaClient.lockdownChannel.findFirst({
          where: {
            channelID: BigInt(channel.id),
            roleID,
            locked: true,
          },
        });

        if (lockedSiblings) {
          return `Cannot add a rule while another rule for the same channel/role is locked. Unlock <#${channel.id}> first.`;
        }

        await prismaClient.lockdownChannel.create({
          data: {
            channelID: BigInt(channel.id),
            guildID: BigInt(interaction.guild.id),
            roleID,
            permission,
          },
        });

        const roleLabel = roleID ? `<@&${roleID}>` : '@everyone';
        return `Added lockdown rule: <#${channel.id}> ${roleLabel} — ${tokenLabel(permission)}.`;
      }

      case 'remove': {
        const channel = interaction.options.getChannel('channel', true);
        const role = interaction.options.getRole('role', false);
        const permission = interaction.options.getString('permission', false);

        const where: {
          channelID: bigint;
          guildID: bigint;
          roleID?: bigint | null;
          permission?: string | null;
        } = {
          channelID: BigInt(channel.id),
          guildID: BigInt(interaction.guild.id),
        };

        if (role !== null) {
          where.roleID = normalizeRoleID(role.id, interaction.guild.id);
        }
        if (permission !== null) {
          where.permission = permission;
        }

        const matching = await prismaClient.lockdownChannel.findMany({ where });

        if (matching.length === 0) {
          return `No matching lockdown rules found for <#${channel.id}>.`;
        }

        if (matching.some(rule => rule.locked)) {
          return `Cannot remove rules that are currently locked. Unlock <#${channel.id}> first, then try again.`;
        }

        await prismaClient.lockdownChannel.deleteMany({
          where: { id: { in: matching.map(rule => rule.id) } },
        });

        return `Removed ${matching.length} lockdown rule${matching.length === 1 ? '' : 's'} from <#${channel.id}>.`;
      }

      case 'list': {
        const rules = await prismaClient.lockdownChannel.findMany({
          where: {
            guildID: BigInt(interaction.guild.id),
          },
          orderBy: { createdAt: 'asc' },
        });

        if (rules.length === 0) {
          return 'There are no channels in the lockdown system!';
        }

        const byChannel = new Map<string, LockdownChannel[]>();
        for (const rule of rules) {
          const key = rule.channelID.toString();
          const arr = byChannel.get(key);
          if (arr) {
            arr.push(rule);
          } else {
            byChannel.set(key, [rule]);
          }
        }

        const lines: string[] = [];
        for (const [channelID, channelRules] of byChannel) {
          lines.push(`<#${channelID}>`);
          for (const rule of channelRules) {
            lines.push(`  • ${describeRule(rule)}`);
          }
        }

        return void interaction.reply({
          embeds: [
            new EmbedBuilder({
              title: 'Lockdown Channels',
              description: lines.join('\n'),
              color: Colors.INVISIBLE,
            }),
          ],
        });
      }

      case 'channel': {
        const channel = interaction.options.getChannel('channel', true);
        const discordChannel = interaction.guild.channels.resolve(channel.id) as GuildChannel | null;

        if (!discordChannel) {
          return 'Could not resolve channel.';
        }

        const rules = await prismaClient.lockdownChannel.findMany({
          where: {
            channelID: BigInt(channel.id),
            guildID: BigInt(interaction.guild.id),
          },
        });

        if (rules.length === 0) {
          return `Channel <#${channel.id}> has no lockdown rules. Use \`/lockdown add\` first.`;
        }

        const shouldUnlock = rules.some(rule => rule.locked);
        const groups = groupRulesByRole(rules);
        const reason = `/lockdown channel by @${interaction.user.username} (${interaction.user.id})`;

        for (const groupRules of groups.values()) {
          if (shouldUnlock) {
            if (groupRules.some(rule => rule.locked)) {
              await unlockRuleGroup(discordChannel, groupRules, reason);
            }
          } else {
            await lockRuleGroup(discordChannel, groupRules, reason);
          }
        }

        return `Channel <#${channel.id}> is now ${shouldUnlock ? 'unlocked' : 'locked'}.`;
      }

      case 'server': {
        const rules = await prismaClient.lockdownChannel.findMany({
          where: {
            guildID: BigInt(interaction.guild.id),
          },
        });

        if (rules.length === 0) {
          return 'There are no channels in the lockdown system!';
        }

        const lockdown = rules.some(rule => rule.locked);

        // Group by channel+role to count actual permission edits.
        const groupCount = (() => {
          const seen = new Set<string>();
          for (const rule of rules) {
            if (lockdown && !rule.locked) continue;
            seen.add(`${rule.channelID}:${rule.roleID ?? 'e'}`);
          }
          return seen.size;
        })();

        return void interaction.reply({
          embeds: [
            new EmbedBuilder({
              title: 'Are you sure?',
              description: lockdown
                ? `You are about to unlock ${groupCount} channel/role group${groupCount === 1 ? '' : 's'}.`
                : `You are about to lock ${groupCount} channel/role group${groupCount === 1 ? '' : 's'}.`,
              color: Colors.INVISIBLE,
            }),
          ],
          components: [
            new ActionRowBuilder<ButtonBuilder>()
              .addComponents(
                new ButtonBuilder()
                  .setLabel('Confirm')
                  .setCustomId(`lockdown-confirm:${userEntry.id}`)
                  .setStyle(ButtonStyle.Success),
              ),
          ],
        });
      }

      case 'prune': {
        const rules = await prismaClient.lockdownChannel.findMany({
          where: {
            guildID: BigInt(interaction.guild.id),
          },
        });

        if (rules.length === 0) {
          return 'There are no rules in the lockdown system to prune!';
        }

        const orphanedRules: LockdownChannel[] = [];
        for (const rule of rules) {
          const discordChannel = interaction.guild.channels.resolve(rule.channelID.toString());
          if (!discordChannel) {
            orphanedRules.push(rule);
            continue;
          }
          if (rule.roleID && !interaction.guild.roles.resolve(rule.roleID.toString())) {
            orphanedRules.push(rule);
          }
        }

        if (orphanedRules.length === 0) {
          return 'No invalid rules found in lockdown system. All rules are valid!';
        }

        const ruleList = orphanedRules
          .map(rule => `<#${rule.channelID}> ${rule.roleID ? `<@&${rule.roleID}>` : '@everyone'} — ${tokenLabel(rule.permission)}`)
          .join('\n');

        return void interaction.reply({
          embeds: [
            new EmbedBuilder({
              title: 'Confirm Lockdown Prune',
              description: `These ${orphanedRules.length} invalid rule${orphanedRules.length === 1 ? '' : 's'} will be removed from the lockdown system:\n\n${ruleList}\n\n**Are you sure?**`,
              color: Colors.ORANGE,
            }),
          ],
          components: [
            new ActionRowBuilder<ButtonBuilder>()
              .addComponents(
                new ButtonBuilder()
                  .setLabel('Confirm Prune')
                  .setCustomId(`lockdown-prune-confirm:${userEntry.id}:${orphanedRules.map(rule => rule.id).join(',')}`)
                  .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                  .setLabel('Cancel')
                  .setCustomId(`lockdown-prune-cancel:${userEntry.id}`)
                  .setStyle(ButtonStyle.Secondary),
              ),
          ],
        });
      }
    }
  };
}
