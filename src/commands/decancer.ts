import { ModerationLogType } from '@prisma/client';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { CONFIG } from '../config';
import { Colors } from '../constants/colors';
import { fetchFrozenNickname } from '../events/guildMemberUpdate/frozen-nickname';
import { Command, CommandContext } from '../structures/command';
import { decancerString } from '../utils/decancer';
import { canDecancer } from '../utils/moderation';
import { registerModerationLog, sendModerationLog } from '../utils/moderation-log';

export class DecancerCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('decancer')
    .setDescription("Clean a user's nickname by removing special characters and symbols")
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User whose nickname to clean')
        .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for cleaning the nickname')
        .setRequired(false),
    );

  public override servers = [CONFIG.ids.servers.dmc];

  public override execute = async ({ interaction }: CommandContext): Promise<EmbedBuilder | string | void> => {
    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', false) ?? 'Nickname contained special characters';

    const targetMember = interaction.guild.members.resolve(targetUser.id);
    const moderatorMember = interaction.guild.members.resolve(interaction.user.id);

    await interaction.deferReply({ ephemeral: true });

    if (!targetMember) {
      return new EmbedBuilder()
        .setDescription('Could not find this member. They probably left.')
        .setColor(Colors.RED);
    }

    if (!moderatorMember) {
      return new EmbedBuilder()
        .setDescription('Could not find your member record.')
        .setColor(Colors.RED);
    }

    if (!canDecancer(moderatorMember, targetMember)) {
      return new EmbedBuilder()
        .setDescription("You cannot change this user's nickname.")
        .setColor(Colors.RED);
    }

    const frozenNickname = await fetchFrozenNickname(targetUser.id);
    if (frozenNickname) {
      return new EmbedBuilder()
        .setDescription("This nickname is frozen.")
        .setColor(Colors.RED);
    }

    const originalName = targetMember.displayName;
    let cleanedName = decancerString(originalName);

    if (!cleanedName || cleanedName.length < 2) {
      cleanedName = decancerString(targetUser.username);
      if (!cleanedName || cleanedName.length < 2) {
        cleanedName = `User${targetUser.id.slice(-4)}`;
      }
    }

    if (cleanedName.length > 32) {
      cleanedName = cleanedName.substring(0, 32);
    }

    if (originalName === cleanedName) {
      return new EmbedBuilder()
        .setDescription("This user's nickname is already clean.")
        .setColor(Colors.YELLOW);
    }

    try {
      await targetMember.setNickname(cleanedName, `Decancer by ${interaction.user.username} | ${reason}`);
    } catch {
      return new EmbedBuilder()
        .setDescription("Could not change this user's nickname. Check bot permissions.")
        .setColor(Colors.RED);
    }

    const log = await registerModerationLog(
      ModerationLogType.DECANCER,
      BigInt(interaction.user.id),
      BigInt(targetUser.id),
      BigInt(interaction.guildId),
      reason,
    );

    await sendModerationLog(
      new EmbedBuilder()
        .setTitle('☣️ Decancer')
        .setDescription(
          `**User:** ${targetUser.username} <@${targetUser.id}>\n` +
          `**Original Name:** ${originalName}\n` +
          `**New Name:** ${cleanedName}\n` +
          `**Reason:** ${reason}\n` +
          `**Moderator:** ${interaction.user.username} <@${interaction.user.id}>`,
        )
        .setFooter({ text: `ID: ${targetUser.id} | #${log.id}` })
        .setTimestamp()
        .setColor(Colors.BLUE),
    );

    return new EmbedBuilder()
      .setAuthor({
        name: `${targetUser.username}'s nickname has been cleaned`,
        iconURL: targetUser.avatarURL(),
      })
      .setColor(Colors.INVISIBLE)
      .addFields(
        {
          name: 'Original Name',
          value: originalName,
          inline: true,
        },
        {
          name: 'New Name',
          value: cleanedName,
          inline: true,
        },
        {
          name: 'Reason',
          value: reason,
          inline: false,
        },
      );
  };
}
