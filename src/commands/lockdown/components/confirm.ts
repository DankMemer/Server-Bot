import { LockdownChannel } from '@prisma/client';
import { EmbedBuilder, Guild, GuildChannel, PermissionFlagsBits } from 'discord.js';
import { Colors } from '../../../constants/colors';
import { logger } from '../../../lib/logger';
import { prismaClient } from '../../../lib/prisma-client';
import { Component, ComponentContext } from '../../../structures/component';
import { ephemeralResponse } from '../../../utils/format';
import { canManageLockdown } from '../../../utils/moderation';
import { groupRulesByRole, lockRuleGroup, relockRuleGroup, unlockRuleGroup } from '../perms';

interface DiscordOnboarding {
  enabled: boolean;
}

async function fetchOnboarding(guild: Guild): Promise<DiscordOnboarding> {
  return await guild.client.rest.get(`/guilds/${guild.id}/onboarding`) as DiscordOnboarding;
}

async function setOnboardingEnabled(guild: Guild, enabled: boolean): Promise<void> {
  await guild.client.rest.put(`/guilds/${guild.id}/onboarding`, {
    body: {
      enabled,
    },
  });
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 1_500);
  }

  return String(error).slice(0, 1_500);
}

type ChangedRuleGroup = {
  channel: GuildChannel;
  rules: LockdownChannel[];
  lockedSnapshot?: LockdownChannel[];
};

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

    const changedRuleGroups: ChangedRuleGroup[] = [];
    let lockdown = false;
    let onboardingDisabledByAttempt = false;
    let onboardingRestored = false;

    try {
      const botMember = interaction.guild.members.me ?? await interaction.guild.members.fetchMe();
      const missingPermissions = [
        [PermissionFlagsBits.ManageGuild, 'Manage Server'],
        [PermissionFlagsBits.ManageRoles, 'Manage Roles'],
      ] as const;
      const missingPermissionNames = missingPermissions
        .filter(([permission]) => !botMember.permissions.has(permission))
        .map(([, name]) => name);

      if (missingPermissionNames.length > 0) {
        throw new Error(`The bot is missing required permission${missingPermissionNames.length === 1 ? '' : 's'}: ${missingPermissionNames.join(', ')}.`);
      }

      const rules = await prismaClient.lockdownChannel.findMany({
        where: {
          guildID: BigInt(interaction.guild.id),
        },
      });

      lockdown = rules.some(rule => rule.locked);
      const reason = `/lockdown server by @${interaction.user.username} (${interaction.user.id})`;
      const guildID = BigInt(interaction.guild.id);

      // Record that onboarding must be restored before disabling it. If the
      // Discord request has an ambiguous failure, keeping the snapshot is safe.
      if (!lockdown) {
        const onboarding = await fetchOnboarding(interaction.guild);
        if (onboarding.enabled) {
          await prismaClient.lockdownGuildSnapshot.upsert({
            where: { guildID },
            create: { guildID, onboardingWasEnabled: true },
            update: { onboardingWasEnabled: true },
          });
          await setOnboardingEnabled(interaction.guild, false);
          onboardingDisabledByAttempt = true;
        }
      }

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
              const lockedSnapshot = groupRules.map(rule => ({ ...rule }));
              await unlockRuleGroup(discordChannel, groupRules, reason);
              changedRuleGroups.push({ channel: discordChannel, rules: groupRules, lockedSnapshot });
            }
          } else {
            await lockRuleGroup(discordChannel, groupRules, reason);
            changedRuleGroups.push({ channel: discordChannel, rules: groupRules });
          }
        }
      }

      // Only remove the snapshot after Discord confirms onboarding was restored.
      if (lockdown) {
        const snapshot = await prismaClient.lockdownGuildSnapshot.findUnique({
          where: { guildID },
        });
        if (snapshot?.onboardingWasEnabled) {
          const onboarding = await fetchOnboarding(interaction.guild);
          if (!onboarding.enabled) {
            await setOnboardingEnabled(interaction.guild, true);
          }
          onboardingRestored = true;
          await prismaClient.lockdownGuildSnapshot.delete({
            where: { guildID },
          });
        }
      }

    } catch (error) {
      logger.error(error instanceof Error ? error.stack : String(error));

      const rollbackErrors: unknown[] = [];
      const rollbackReason = `/lockdown rollback after failure by @${interaction.user.username} (${interaction.user.id})`;

      // If onboarding was already restored, the externally visible unlock
      // succeeded and rolling channel permissions back would create a mismatch.
      if (!onboardingRestored) {
        for (const changedGroup of [...changedRuleGroups].reverse()) {
          try {
            if (lockdown) {
              await relockRuleGroup(
                changedGroup.channel,
                changedGroup.lockedSnapshot ?? changedGroup.rules,
                rollbackReason,
              );
            } else {
              await unlockRuleGroup(changedGroup.channel, changedGroup.rules, rollbackReason);
            }
          } catch (rollbackError) {
            rollbackErrors.push(rollbackError);
            logger.error(rollbackError instanceof Error ? rollbackError.stack : String(rollbackError));
          }
        }

        if (onboardingDisabledByAttempt) {
          try {
            await setOnboardingEnabled(interaction.guild, true);
            await prismaClient.lockdownGuildSnapshot.delete({
              where: { guildID: BigInt(interaction.guild.id) },
            });
          } catch (rollbackError) {
            rollbackErrors.push(rollbackError);
            logger.error(rollbackError instanceof Error ? rollbackError.stack : String(rollbackError));
          }
        }
      }

      const rollbackStatus = onboardingRestored
        ? 'The server was unlocked and onboarding was restored, but the saved recovery state could not be cleaned up.'
        : rollbackErrors.length === 0
          ? 'Any changes made during this attempt were rolled back.'
          : 'Some changes could not be rolled back; check the bot logs before trying again.';

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Lockdown failed')
            .setDescription(`${errorMessage(error)}\n\n${rollbackStatus}`)
            .setColor(Colors.RED),
        ],
        components: [],
      });
      return;
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
