
import { SlashCommandBuilder } from 'discord.js';
import { CONFIG } from '../config';
import { prismaClient } from '../lib/prisma-client';
import { Command, CommandContext } from '../structures/command';

const WHITELISTED_ROLES = [
  CONFIG.ids.roles.dmc.trialModerator,
  CONFIG.ids.roles.dmc.giveawayManager,
  CONFIG.ids.roles.dmc.moderator,
  CONFIG.ids.roles.dmo.moderator,
  CONFIG.ids.roles.dmc.serverManager,
  CONFIG.ids.roles.dmo.serverManager,
];

function parseUserIds(input: string): string[] {
  return input
    .split(/[\s,]+/)
    .map(id => id.trim())
    .filter(id => /^\d+$/.test(id));
}

export class MentionCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('mention')
    .setDescription('Resolve user IDs into mentions with modlog indicators')
    .addStringOption(option =>
      option
        .setName('users')
        .setDescription('User IDs separated by spaces or commas')
        .setRequired(true),
    );

  public override servers = [CONFIG.ids.servers.dmc, CONFIG.ids.servers.dmo];

  public override execute = async ({ interaction }: CommandContext): Promise<void> => {
    const moderator = interaction.guild.members.resolve(interaction.user.id);

    if (!moderator || !moderator.roles.cache.hasAny(...WHITELISTED_ROLES)) {
      await interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true,
      });
      return;
    }

    const usersInput = interaction.options.getString('users', true);
    const userIds = parseUserIds(usersInput);

    if (userIds.length === 0) {
      await interaction.reply({
        content: 'No valid user IDs provided.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const modlogs = await prismaClient.moderationLog.findMany({
      where: {
        offenderID: { in: userIds.map(id => BigInt(id)) },
      },
      distinct: ['offenderID'],
      select: { offenderID: true },
    });

    const idsWithModlogs = new Set(modlogs.map(log => log.offenderID.toString()));

    const lines = userIds.map(id => {
      const hasModlogs = idsWithModlogs.has(id);
      return `• <@${id}>${hasModlogs ? ' 💬' : ''}`;
    });

    await interaction.editReply({
      content: lines.join('\n'),
    });
  };
}
