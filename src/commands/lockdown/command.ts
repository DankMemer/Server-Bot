import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { CONFIG } from '../../config';
import { Colors } from '../../constants/colors';
import { prismaClient } from '../../lib/prisma-client';
import { Command, CommandContext } from '../../structures/command';
import { canManageLockdown } from '../../utils/moderation';

export class LockdownCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Manage server lockdown')
    .addSubcommand(option =>
      option
        .setName('add')
        .setDescription('Add channel to lockdown system')
        .addChannelOption(subOption =>
          subOption
            .setName('channel')
            .setDescription('Channel to add')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)
            .setRequired(true),
        ),
    )
    .addSubcommand(option =>
      option
        .setName('remove')
        .setDescription('Remove channel from lockdown system')
        .addChannelOption(subOption =>
          subOption
            .setName('channel')
            .setDescription('Channel to remove')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)
            .setRequired(true),
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
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)
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
        .setDescription('Remove invalid channel entries from lockdown system'),
    );

  public override servers = [CONFIG.ids.servers.dmc];

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
        const lockdownChannel = await prismaClient.lockdownChannel.findUnique({
          where: {
            id: BigInt(channel.id),
          },
        });

        if (lockdownChannel) {
          return `Channel <#${channel.id}> is already in the lockdown system!`;
        }

        await prismaClient.lockdownChannel.create({
          data: {
            id: BigInt(channel.id),
            guildID: BigInt(interaction.guild.id),
            locked: false,
          },
        });

        return `Successfully added <#${channel.id}> to the lockdown system!`;
      }

      case 'remove': {
        const channel = interaction.options.getChannel('channel', true);
        const lockdownChannel = await prismaClient.lockdownChannel.findUnique({
          where: {
            id: BigInt(channel.id),
          },
        });

        if (!lockdownChannel) {
          return `Channel <#${channel.id}> is not in the lockdown system!`;
        }

        await prismaClient.lockdownChannel.delete({
          where: {
            id: BigInt(channel.id),
          },
        });

        return `Successfully removed <#${channel.id}> from the lockdown system!`;
      }

      case 'list': {
        const lockdownChannels = await prismaClient.lockdownChannel.findMany({
          where: {
            guildID: BigInt(interaction.guild.id),
          },
        });

        if (lockdownChannels.length === 0) {
          return 'There are no channels in the lockdown system!';
        }

        return void interaction.reply({
          embeds: [
            new EmbedBuilder({
              title: 'Lockdown Channels',
              description: lockdownChannels
                .sort((a, z) => a.createdAt.getTime() - z.createdAt.getTime())
                .map(lockdownChannel => `<#${lockdownChannel.id}>`)
                .join('\n'),
              color: Colors.INVISIBLE,
            }),
          ],
        });
      }

      case 'channel': {
        const channel = interaction.options.getChannel('channel', true);
        const discordChannel = interaction.guild.channels.resolve(channel.id);

        if (discordChannel.type === ChannelType.GuildText) {
          const locked = !(discordChannel.permissionsFor(interaction.guild.id)?.has('SendMessages') ?? true);

          await discordChannel.permissionOverwrites.edit(
            interaction.guild.id,
            {
              SendMessages: locked,
            },
            {
              reason: `/lockdown channel by @${interaction.user.username} (${interaction.user.id})`,
            },
          );

          return `Channel <#${channel.id}> is now ${locked ? 'unlocked' : 'locked'}.`;
        }

        if (discordChannel.type === ChannelType.GuildVoice) {
          const locked = !(discordChannel.permissionsFor(interaction.guild.id)?.has('Connect') ?? true);
          await discordChannel.permissionOverwrites.edit(
            interaction.guild.id,
            {
              Connect: locked,
            },
            {
              reason: `/lockdown channel by @${interaction.user.username} (${interaction.user.id})`,
            },
          );

          return `Channel <#${channel.id}> is now ${locked ? 'unlocked' : 'locked'}.`;
        }

        return 'Something went wrong. Please contact badosz.';
      }

      case 'server': {
        const channels = await prismaClient.lockdownChannel.findMany({
          where: {
            guildID: BigInt(interaction.guild.id),
          },
        });

        const lockdown = channels.some(lockdownChannel => lockdownChannel.locked);

        return void interaction.reply({
          embeds: [
            new EmbedBuilder({
              title: 'Are you sure?',
              description: lockdown
                ? `You are about to unlock ${channels.filter(lockdownChannel => lockdownChannel.locked).length} channels.`
                : `You are about to lock ${channels.filter(lockdownChannel => !lockdownChannel.locked).length} channels.`,
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
        const lockdownChannels = await prismaClient.lockdownChannel.findMany({
          where: {
            guildID: BigInt(interaction.guild.id),
          },
        });

        if (lockdownChannels.length === 0) {
          return 'There are no channels in the lockdown system to prune!';
        }

        const deletedChannels = [];
        for (const lockdownChannel of lockdownChannels) {
          const discordChannel = interaction.guild.channels.resolve(lockdownChannel.id.toString());
          if (!discordChannel) {
            deletedChannels.push(lockdownChannel);
          }
        }

        if (deletedChannels.length === 0) {
          return 'No invalid channels found in lockdown system. All channels are valid!';
        }

        const channelList = deletedChannels
          .map(channel => `<#${channel.id}> (\`${channel.id}\`)`)
          .join('\n');

        return void interaction.reply({
          embeds: [
            new EmbedBuilder({
              title: 'Confirm Lockdown Prune',
              description: `These ${deletedChannels.length} invalid channel${deletedChannels.length === 1 ? '' : 's'} will be removed from lockdown system:\n\n${channelList}\n\n**Are you sure?**`,
              color: Colors.ORANGE,
            }),
          ],
          components: [
            new ActionRowBuilder<ButtonBuilder>()
              .addComponents(
                new ButtonBuilder()
                  .setLabel('Confirm Prune')
                  .setCustomId(`lockdown-prune-confirm:${userEntry.id}:${deletedChannels.map(c => c.id).join(',')}`)
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

