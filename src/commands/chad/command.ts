
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, Options, SlashCommandBuilder, TextChannel } from 'discord.js';
import HolyTime from 'holy-time';
import { CONFIG } from '../../config';
import { Colors } from '../../constants/colors';
import { prismaClient } from '../../lib/prisma-client';
import { redisClient } from '../../lib/redis-client';
import { Command, CommandContext } from '../../structures/command';

export class ChadCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('chad')
    .setDescription('Manage your chad options')
    .addSubcommandGroup(option =>
      option
        .setName('channel')
        .setDescription('Manage your chad channel')
        .addSubcommand(subOption =>
          subOption
            .setName('create')
            .setDescription('Create your chad channel'),
        )
        .addSubcommand(subOption =>
          subOption
            .setName('delete')
            .setDescription('Delete your chad channel')
            .addStringOption(subSubOption =>
              subSubOption
                .setName('best_developer_name_to_confirm')
                .setDescription('Confirm deletion')
                .setRequired(false),
            ),
        )
        .addSubcommand(subOption =>
          subOption
            .setName('update')
            .setDescription('Update your chad channel'),
        ),
    );

  public override servers = [ CONFIG.ids.servers.dmc ];

  public static renderChadChannelMenu(discordChannel: TextChannel, userID: bigint): Options {
    const users = [ ...discordChannel.permissionOverwrites.cache.keys() ]
      .filter(id => ![ userID.toString(), CONFIG.ids.servers.dmc ].includes(id));

    return {
      embeds: [
        new EmbedBuilder({
          title: 'Chad Channel',
          description: `> <#${discordChannel.id}>`,
          color: Colors.INVISIBLE,
          fields: users.length > 0
            ? [ {
              name: `Allowed Users (${users.length} / 2)`,
              value: users.map(id => `<@${id}>`).join('\n'),
            } ]
            : [],
        }),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setLabel('Update Name')
              .setCustomId(`chad-name:${userID}`)
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setLabel('Update Users')
              .setCustomId(`chad-users:${userID}`)
              .setStyle(ButtonStyle.Secondary),
          ),
      ],

    };
  }

  public override execute = async ({ interaction, userEntry }: CommandContext): Promise<void | string> => {
    const member = interaction.guild.members.resolve(interaction.user.id);

    if (!member.roles.cache.has(CONFIG.ids.roles.dmc.chad) && !member.roles.cache.has(CONFIG.ids.roles.dmc.team)) {
      return 'You are not a chad!';
    }

    const group = interaction.options.getSubcommandGroup();

    switch (group) {
      case 'channel': {
        const action = interaction.options.getSubcommand();

        switch (action) {
          case 'create': {
            const chadChannel = await prismaClient.chadChannel.findUnique({
              where: {
                userID: userEntry.id,
              },
            });

            if (chadChannel) {
              const discordChannel = interaction.guild.channels.resolve(chadChannel.id.toString());

              if (!discordChannel) {
                await prismaClient.chadChannel.delete({
                  where: {
                    userID: userEntry.id,
                  },
                });
              } else {
                return `You already have a chad channel! (<#${discordChannel.id}>)`;
              }
            }

            const channel = await interaction.guild.channels.create({
              name: member.user.username.toLowerCase().replace(/[^A-Za-z]/, ''),
              type: ChannelType.GuildText,
              parent: CONFIG.ids.channels.dmc.chadCategory,
              permissionOverwrites: [
                {
                  id: interaction.user.id,
                  allow: [
                    'ViewChannel',
                    'SendMessages',
                    'EmbedLinks',
                    'AttachFiles',
                    'ReadMessageHistory',
                    'UseExternalEmojis',
                    'ManageMessages',
                    'SendMessagesInThreads',
                  ],
                },
                {
                  id: CONFIG.ids.servers.dmc,
                  deny: [
                    'ViewChannel',
                  ],
                },
              ],
            });

            await prismaClient.chadChannel.create({
              data: {
                id: BigInt(channel.id),
                userID: userEntry.id,
              },
            });

            return `Successfully created your chad channel! (<#${channel.id}>)`;
          }

          case 'delete': {
            if (await redisClient.get(`chad-channel-delete-cooldown:${interaction.user.id}`)) {
              return 'You are on a cooldown. Please wait a week before deleting your chad channel again.';
            }

            const confirmation = interaction.options.getString('best_developer_name_to_confirm', false)?.toLowerCase() === 'badosz';

            if (!confirmation) {
              return 'You must confirm this action by typing in the name of the best developer.';
            }

            const chadChannel = await prismaClient.chadChannel.findUnique({
              where: {
                userID: userEntry.id,
              },
            });

            if (!chadChannel) {
              return 'You do not have a chad channel!';
            }

            await redisClient.setEx(`chad-channel-delete-cooldown:${interaction.user.id}`, HolyTime.Units.WEEK / HolyTime.Units.SECOND, '1');

            const discordChannel = interaction.guild.channels.resolve(chadChannel.id.toString());

            if (!discordChannel) {
              await prismaClient.chadChannel.delete({
                where: {
                  userID: userEntry.id,
                },
              });

              return 'Your chad channel was deleted!';
            }

            await discordChannel.delete();

            return 'Your chad channel was deleted!';
          }

          case 'update': {
            const chadChannel = await prismaClient.chadChannel.findUnique({
              where: {
                userID: userEntry.id,
              },
            });

            if (!chadChannel) {
              return 'You do not have a chad channel!';
            }

            const discordChannel = interaction.guild.channels.resolve(chadChannel.id.toString());

            if (!discordChannel || discordChannel.type !== ChannelType.GuildText) {
              return 'Something went wrong. Please contact badosz.';
            }

            interaction.reply(ChadCommand.renderChadChannelMenu(discordChannel, userEntry.id));
          }
        }
      }
    }
  };
}

