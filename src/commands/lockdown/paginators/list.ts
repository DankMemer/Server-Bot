import { LockdownChannel } from '@prisma/client';
import { ChannelType, Guild } from 'discord.js';
import { prismaClient } from '../../../lib/prisma-client';
import { Paginator, PaginatorContext, PaginatorOutput } from '../../../structures/paginator';
import { tokenLabel } from '../perms';

function isDefaultRule(rule: LockdownChannel): boolean {
  return rule.roleID === null && rule.permission === null;
}

function describeRule(rule: LockdownChannel): string {
  const role = rule.roleID ? `<@&${rule.roleID}>` : '@everyone';
  return `${role}: ${tokenLabel(rule.permission)}${rule.locked ? ' [locked]' : ''}`;
}

// Sidebar order: channels with no parent category appear above all categories,
// then channels are grouped under their category in (text, voice) order.
// Returns Infinity components for channels that no longer exist so they sink to the bottom.
function channelSortKey(channelID: string, guild: Guild): [number, number, number] {
  const channel = guild.channels.resolve(channelID);
  if (!channel || !('rawPosition' in channel)) return [Infinity, Infinity, Infinity];

  const parent = channel.parent;
  const categoryPosition = parent ? parent.rawPosition : -1;
  const isVoice = channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice;
  return [categoryPosition, isVoice ? 1 : 0, channel.rawPosition];
}

function compareSortKeys(a: [number, number, number], b: [number, number, number]): number {
  return (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]);
}

export class LockdownListPaginator extends Paginator {
  public override id = 'lockdown-list';
  public override itemsPerPage = 10;

  public async handle({ payload, interaction }: PaginatorContext): Promise<PaginatorOutput> {
    const rules = await prismaClient.lockdownChannel.findMany({
      where: {
        guildID: BigInt(payload),
      },
      orderBy: { createdAt: 'asc' },
    });

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

    const guild = interaction.guild;
    const orderedChannelIDs = [...byChannel.keys()];
    if (guild) {
      orderedChannelIDs.sort((a, b) => compareSortKeys(channelSortKey(a, guild), channelSortKey(b, guild)));
    }

    const items: string[] = [];
    for (const channelID of orderedChannelIDs) {
      const channelRules = byChannel.get(channelID)!;
      const hasDefault = channelRules.some(isDefaultRule);
      const specialRules = channelRules.filter(rule => !isDefaultRule(rule));

      const header = `<#${channelID}>${hasDefault ? ' (default)' : ''}`;
      if (specialRules.length === 0) {
        items.push(header);
      } else {
        items.push(
          `${header}\n` +
          specialRules.map(rule => `  • ${describeRule(rule)}`).join('\n'),
        );
      }
    }

    return {
      delimiter: '\n',
      items,
      payload,
      embed: {
        title: 'Lockdown Channels',
      },
    };
  }
}
