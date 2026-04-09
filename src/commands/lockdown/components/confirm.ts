import { LockdownChannel } from '@prisma/client';
import { EmbedBuilder, GuildChannel } from 'discord.js';
import { Colors } from '../../../constants/colors';
import { prismaClient } from '../../../lib/prisma-client';
import { Component, ComponentContext } from '../../../structures/component';
import { ephemeralResponse } from '../../../utils/format';
import { canManageLockdown } from '../../../utils/moderation';
import { groupRulesByRole, lockRuleGroup, unlockRuleGroup } from '../perms';

export class LockdownConfirmComponent extends Component {
  public override id = 'lockdown-confirm';

  public override async execute({ interaction }: ComponentContext): Promise<void> {
    if (interaction.user.id !== interaction.customId.split(':')[1]) {
      return void interaction.reply(ephemeralResponse('You cannot do this.'));
    }

    const moderatorMember = interaction.guild.members.resolve(interaction.user.id);

    if (!moderatorMember || !canManageLockdown(moderatorMember)) {
      return void interaction.reply(ephemeralResponse('You do not have permission to manage lockdown.'));
    }

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('Lockdown')
          .setDescription('Processing...')
          .setColor(Colors.YELLOW),
      ],
      components: [],
    });

    const rules = await prismaClient.lockdownChannel.findMany({
      where: {
        guildID: BigInt(interaction.guild.id),
      },
    });

    const lockdown = rules.some(rule => rule.locked);
    const reason = `/lockdown server by @${interaction.user.username} (${interaction.user.id})`;

    // Group rules by channel, then by role within each channel.
    const byChannel = new Map<string, LockdownChannel[]>();
    for (const rule of rules) {
      if (lockdown && !rule.locked) continue;
      const key = rule.channelID.toString();
      const arr = byChannel.get(key);
      if (arr) {
        arr.push(rule);
      } else {
        byChannel.set(key, [rule]);
      }
    }

    for (const [channelID, channelRules] of byChannel) {
      await new Promise(resolve => setTimeout(resolve, 3000));

      const discordChannel = interaction.guild.channels.resolve(channelID) as GuildChannel | null;
      if (!discordChannel) {
        continue;
      }

      const groups = groupRulesByRole(channelRules);
      for (const groupRules of groups.values()) {
        if (lockdown) {
          if (groupRules.some(rule => rule.locked)) {
            await unlockRuleGroup(discordChannel, groupRules, reason);
          }
        } else {
          await lockRuleGroup(discordChannel, groupRules, reason);
        }
      }
    }

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Lockdown')
          .setDescription(`Done ${lockdown ? 'unlocking' : 'locking'} the server`)
          .setColor(Colors.GREEN),
      ],
      components: [],
    });
  }
}
