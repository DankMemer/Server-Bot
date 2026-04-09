import { ChannelType, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { CONFIG } from '../../config';
import { Colors } from '../../constants/colors';
import { prismaClient } from '../../lib/prisma-client';
import { Command, CommandContext } from '../../structures/command';
import { canManageMediaChannels } from '../../utils/moderation';
import { buildMediaChannelEditReply } from './ui';

export class MediaChannelCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('mediachannel')
    .setDescription('Manage media-only channels')
    .setDefaultMemberPermissions('0')
    .addSubcommand(option =>
      option
        .setName('add')
        .setDescription('Designate a channel as a media-only channel')
        .addChannelOption(subOption =>
          subOption
            .setName('channel')
            .setDescription('Channel to add')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    )
    .addSubcommand(option =>
      option
        .setName('remove')
        .setDescription('Remove a channel from the media-only system')
        .addChannelOption(subOption =>
          subOption
            .setName('channel')
            .setDescription('Channel to remove')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    )
    .addSubcommand(option =>
      option
        .setName('list')
        .setDescription('List all media-only channels'),
    )
    .addSubcommand(option =>
      option
        .setName('edit')
        .setDescription('Edit settings for a media-only channel')
        .addChannelOption(subOption =>
          subOption
            .setName('channel')
            .setDescription('Channel to edit')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    );

  public override servers = [CONFIG.ids.servers.dmc, CONFIG.ids.servers.dmo];

  public override execute = async ({ interaction }: CommandContext): Promise<void | string | EmbedBuilder> => {
    const moderatorMember = interaction.guild.members.resolve(interaction.user.id);

    if (!moderatorMember) {
      return 'Could not find your member record.';
    }

    if (!canManageMediaChannels(moderatorMember)) {
      return new EmbedBuilder()
        .setDescription('You do not have permission to manage media channels. You need the Server Manager role.')
        .setColor(Colors.RED);
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'add': {
        const channel = interaction.options.getChannel('channel', true);
        const existing = await prismaClient.mediaChannel.findUnique({
          where: { id: BigInt(channel.id) },
        });

        if (existing) {
          return `Channel <#${channel.id}> is already a media channel!`;
        }

        await prismaClient.mediaChannel.create({
          data: {
            id: BigInt(channel.id),
            guildID: BigInt(interaction.guild.id),
          },
        });

        return `Successfully added <#${channel.id}> as a media channel!`;
      }

      case 'remove': {
        const channel = interaction.options.getChannel('channel', true);
        const existing = await prismaClient.mediaChannel.findUnique({
          where: { id: BigInt(channel.id) },
        });

        if (!existing) {
          return `Channel <#${channel.id}> is not a media channel!`;
        }

        await prismaClient.mediaChannel.delete({
          where: { id: BigInt(channel.id) },
        });

        return `Successfully removed <#${channel.id}> from the media channel system!`;
      }

      case 'list': {
        const mediaChannels = await prismaClient.mediaChannel.findMany({
          where: { guildID: BigInt(interaction.guild.id) },
        });

        if (mediaChannels.length === 0) {
          return 'There are no media channels configured!';
        }

        return void interaction.reply({
          embeds: [
            new EmbedBuilder({
              title: 'Media Channels',
              description: mediaChannels
                .sort((a, z) => a.createdAt.getTime() - z.createdAt.getTime())
                .map(mediaChannel => `<#${mediaChannel.id}>`)
                .join('\n'),
              color: Colors.INVISIBLE,
            }),
          ],
        });
      }

      case 'edit': {
        const channel = interaction.options.getChannel('channel', true);
        const mediaChannel = await prismaClient.mediaChannel.findUnique({
          where: { id: BigInt(channel.id) },
        });

        if (!mediaChannel) {
          return `Channel <#${channel.id}> is not a media channel!`;
        }

        return void interaction.reply(buildMediaChannelEditReply(mediaChannel));
      }
    }
  };
}
