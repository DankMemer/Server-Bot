
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { CONFIG } from '../config';
import { Colors } from '../constants/colors';
import { prismaClient } from '../lib/prisma-client';
import { Command, CommandContext } from '../structures/command';
import { truncate } from '../utils/format';
import { isValidURL } from '../utils/link';

const MEDALS = [ '🥇', '🥈', '🥉' ];

export class StarboardCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('starboard')
    .setDescription('Starboard info')
    .addSubcommand(option =>
      option
        .setName('stats')
        .setDescription('See starboard stats'),

    );
  public override servers = [ CONFIG.ids.servers.dmc ];
  public override execute = async ({ interaction }: CommandContext): Promise<void> => {
    await interaction.deferReply();

    const messages = await prismaClient.starboardMessage.findMany({
      where: {},
      include: {
        stars: true,
      },
    });

    const totalStars = messages.reduce((accumulator, post) => accumulator + post.stars.length, 0);

    const topStarredPosts = messages
      .sort((a, z) => z.stars.length - a.stars.length)
      .slice(0, 5)
      .map((message) => `⭐ **${message.stars.length.toLocaleString()}** - ["${(isValidURL(message.context)) ? '<link>' : truncate(message.context.replaceAll('<', '').replaceAll('>', ''), 35)}"](https://discord.com/channels/${CONFIG.ids.servers.dmc}/${CONFIG.ids.channels.dmc.starboard}/${message.id})`)
      .join('\n');

    const topStarReceivers = Object.entries(
      messages
        .reduce((accumulator, message) => {
          for (const star of message.stars) {
            const starredMessage = messages.find(p => p.id === star.starboardMessageID);

            if (starredMessage) {
              accumulator[starredMessage.authorID.toString()] ??= 0;
              accumulator[starredMessage.authorID.toString()] += 1;
            }
          }

          return accumulator;
        }, {} as Record<string, number>),
    )
      .sort(([ , a ], [ , z ]) => z - a)
      .slice(0, 5)
      .map(([ userID, stars ], i) => `${MEDALS[i] ?? '🔹'} <@${userID}> (${stars.toLocaleString()} stars)`)
      .join('\n');

    const topStarGivers = Object.entries(
      messages
        .reduce((accumulator, message) => {
          for (const star of message.stars) {
            accumulator[star.authorID.toString()] ??= 0;
            accumulator[star.authorID.toString()] += 1;
          }

          return accumulator;
        }, {} as Record<string, number>),
    )
      .sort(([ , a ], [ , z ]) => z - a)
      .slice(0, 5)
      .map(([ userID, stars ], i) => `${MEDALS[i] ?? '🔹'} <@${userID}> (${stars.toLocaleString()} stars)`)
      .join('\n');

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Server Starboard Stats')
          .setDescription(`> **${messages.length.toLocaleString()}** messages starred with a total of **${totalStars.toLocaleString()}** stars.`)
          .addFields([
            {
              name: 'Top Starred Posts',
              value: topStarredPosts,
              inline: false,
            },
          ])
          .addFields([
            {
              name: 'Top Star Receivers',
              value: topStarReceivers,
              inline: true,
            },
          ])
          .addFields([
            {
              name: 'Top Star Givers',
              value: topStarGivers,
              inline: true,
            },
          ])
          .setColor(Colors.INVISIBLE),
      ],
    });
  };
}

