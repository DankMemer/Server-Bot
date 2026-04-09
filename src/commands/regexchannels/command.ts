import { ChannelType, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { CONFIG } from '../../config';
import { Colors } from '../../constants/colors';
import { prismaClient } from '../../lib/prisma-client';
import { Command, CommandContext } from '../../structures/command';
import { canManageMediaChannels } from '../../utils/moderation';
import { formatRegex, parseRegex } from './regex';
import { buildRegexChannelEditReply } from './ui';

export class RegexChannelsCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('regexchannels')
    .setDescription('Manage regex-only channels')
    .setDefaultMemberPermissions('0')
    .addSubcommand(option =>
      option
        .setName('add')
        .setDescription('Designate a channel as a regex-only channel')
        .addChannelOption(subOption =>
          subOption
            .setName('channel')
            .setDescription('Channel to add')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        )
        .addStringOption(subOption =>
          subOption
            .setName('regex')
            .setDescription('Regex messages must match. Pattern or /pattern/flags syntax. Omit for Delete All mode.')
            .setRequired(false),
        ),
    )
    .addSubcommand(option =>
      option
        .setName('remove')
        .setDescription('Remove a channel from the regex-only system')
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
        .setDescription('List all regex-only channels'),
    )
    .addSubcommand(option =>
      option
        .setName('edit')
        .setDescription('Edit settings for a regex-only channel')
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
        .setDescription('You do not have permission to manage regex channels. You need the Server Manager role.')
        .setColor(Colors.RED);
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'add': {
        const channel = interaction.options.getChannel('channel', true);
        const regexInput = interaction.options.getString('regex', false);

        let parsed = null;
        if (regexInput !== null) {
          parsed = parseRegex(regexInput);
          if (!parsed) {
            return 'Invalid regex. Provide a valid pattern or use `/pattern/flags` syntax.';
          }
        }

        const existing = await prismaClient.regexChannel.findUnique({
          where: { id: BigInt(channel.id) },
        });

        if (existing) {
          return `Channel <#${channel.id}> is already a regex channel!`;
        }

        await prismaClient.regexChannel.create({
          data: {
            id: BigInt(channel.id),
            guildID: BigInt(interaction.guild.id),
            pattern: parsed?.pattern ?? '',
            flags: parsed?.flags ?? '',
            deleteAll: parsed === null,
          },
        });

        return parsed
          ? `Successfully added <#${channel.id}> as a regex channel with regex \`${formatRegex(parsed.pattern, parsed.flags)}\`!`
          : `Successfully added <#${channel.id}> as a regex channel in Delete All mode. Use \`/regexchannels edit\` to set a regex later.`;
      }

      case 'remove': {
        const channel = interaction.options.getChannel('channel', true);
        const existing = await prismaClient.regexChannel.findUnique({
          where: { id: BigInt(channel.id) },
        });

        if (!existing) {
          return `Channel <#${channel.id}> is not a regex channel!`;
        }

        await prismaClient.regexChannel.delete({
          where: { id: BigInt(channel.id) },
        });

        return `Successfully removed <#${channel.id}> from the regex channel system!`;
      }

      case 'list': {
        const regexChannels = await prismaClient.regexChannel.findMany({
          where: { guildID: BigInt(interaction.guild.id) },
        });

        if (regexChannels.length === 0) {
          return 'There are no regex channels configured!';
        }

        return void interaction.reply({
          embeds: [
            new EmbedBuilder({
              title: 'Regex Channels',
              description: regexChannels
                .sort((a, z) => a.createdAt.getTime() - z.createdAt.getTime())
                .map(regexChannel => `<#${regexChannel.id}> — \`${formatRegex(regexChannel.pattern, regexChannel.flags)}\``)
                .join('\n'),
              color: Colors.INVISIBLE,
            }),
          ],
        });
      }

      case 'edit': {
        const channel = interaction.options.getChannel('channel', true);
        const regexChannel = await prismaClient.regexChannel.findUnique({
          where: { id: BigInt(channel.id) },
        });

        if (!regexChannel) {
          return `Channel <#${channel.id}> is not a regex channel!`;
        }

        return void interaction.reply(buildRegexChannelEditReply(regexChannel));
      }
    }
  };
}
