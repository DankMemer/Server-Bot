
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import FuzzySearch from 'fuzzy-search';
import { CONFIG } from '../../config';
import { Colors } from '../../constants/colors';
import { memerClient, MemerItem } from '../../lib/memer-client';
import { prismaClient } from '../../lib/prisma-client';
import { AutocompleteContext, AutocompleteReturnable, Command, CommandContext } from '../../structures/command';
import { codeblock } from '../../utils/codeblock';
import { upsertUsers } from '../../utils/db';
import { ephemeralResponse } from '../../utils/format';
import { DonateListPaginator } from './paginators/list';

export class DonateCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('donate')
    .setDescription('Donations management')
    .addSubcommand(option =>
      option
        .setName('giveaway')
        .setDescription('Express willingness to donate to a giveaway')
        .addNumberOption(subOption =>
          subOption
            .setName('hours')
            .setMinValue(1)
            .setDescription('How long should the giveaway last?')
            .setRequired(true),
        )
        .addNumberOption(subOption =>
          subOption
            .setName('winners')
            .setMinValue(1)
            .setMaxValue(5)
            .setDescription('How many winners?')
            .setRequired(true),
        )
        .addNumberOption(subOption =>
          subOption
            .setName('quantity')
            .setDescription('How much do you want to donate?')
            .setRequired(true),
        )
        .addStringOption(subOption =>
          subOption
            .setName('item')
            .setDescription('What item?')
            .setAutocomplete(false),
        )
        .addStringOption(subOption =>
          subOption
            .setName('message')
            .setDescription('What message do you want to feature?'),
        )
        .addBooleanOption(subOption =>
          subOption
            .setName('ping')
            .setDescription('Do you want to ping the giveaway role?'),
        ),
    )
    .addSubcommand(option =>
      option
        .setName('heist')
        .setDescription('Express willingness to donate to a heist')
        .addNumberOption(subOption =>
          subOption
            .setName('quantity')
            .setDescription('How much do you want to donate?')
            .setRequired(true),
        )
        .addBooleanOption(subOption =>
          subOption
            .setName('ping')
            .setDescription('Do you want to ping the giveaway role?'),
        ),
    )
    .addSubcommand(option =>
      option
        .setName('view')
        .setDescription('View donations')
        .addUserOption(subOption =>
          subOption
            .setName('user')
            .setDescription('User to check'),
        ),
    )
    .addSubcommand(option =>
      option
        .setName('add')
        .setDescription('Add a donation log manually')
        .addNumberOption(subOption =>
          subOption
            .setName('quantity')
            .setDescription('How much do you want to add?')
            .setRequired(true),
        )
        .addUserOption(subOption =>
          subOption
            .setName('user')
            .setDescription('User to update')
            .setRequired(true),
        ),
    );

  public override autocomplete = ({ value }: AutocompleteContext): AutocompleteReturnable => {
    const fuzzySearch = new FuzzySearch(memerClient.items, [ 'name' ], {
      caseSensitive: false,
      sort: true,
    });

    return fuzzySearch
      .search(value)
      .map(item => ({
        name: item.name,
        value: item.id.toString(),
      }));
  };

  public static listPaginator = new DonateListPaginator();

  public override servers = [ CONFIG.ids.servers.dmc ];
  public override async execute({ interaction }: CommandContext): Promise<void> {
    const action = interaction.options.getSubcommand();

    switch (action) {
      case 'giveaway': {
        const itemID = interaction.options.getString('item', false);
        let item: MemerItem;

        if (itemID) {
          item = memerClient.items.find(i => i.id.toString() === itemID);

          if (!item) {
            return void interaction.reply(ephemeralResponse('Invalid item!'));
          }
        }

        const value = interaction.options.getNumber('quantity', true) * (item?.marketValue ?? 1);

        interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(`${interaction.user.username} wants to donate to a giveaway`)
              .setColor(Colors.INVISIBLE)
              .setThumbnail(interaction.user.avatarURL())
              .setDescription(
                `**Hours:** ${interaction.options.getNumber('hours', true)}\n` +
                `**Winners:** ${interaction.options.getNumber('winners', true)}\n` +
                `**Ping:** ${interaction.options.getBoolean('ping', false) ? 'Yes' : 'No'}\n\n` +
                `**Quantity:** ${interaction.options.getNumber('quantity', true)}\n` +
                (item
                  ? `**Item:** ${item.emoji} ${item.name}\n\n`
                  : '\n') +
                `**Message:**\n${codeblock(interaction.options.getString('message', false) ?? '-')}\n` +
                `**Total Value:** ${codeblock(value.toLocaleString())}\n`,
              ),
          ],
          components: [
            new ActionRowBuilder<ButtonBuilder>()
              .addComponents(
                new ButtonBuilder()
                  .setLabel('Accept')
                  .setCustomId(`donate-accept:${interaction.user.id}:${value}:giveaway`)
                  .setStyle(ButtonStyle.Success),
              ),
          ],
        });
        break;
      }

      case 'heist': {
        const value = interaction.options.getNumber('quantity', true);

        interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(`${interaction.user.username} wants to donate to a heist`)
              .setColor(Colors.INVISIBLE)
              .setThumbnail(interaction.user.avatarURL())
              .setDescription(
                `**Ping:** ${interaction.options.getBoolean('ping', false) ? 'Yes' : 'No'}\n\n` +
                `**Total Value:** ${codeblock(value.toLocaleString())}\n`,
              ),
          ],
          components: [
            new ActionRowBuilder<ButtonBuilder>()
              .addComponents(
                new ButtonBuilder()
                  .setLabel('Accept')
                  .setCustomId(`donate-accept:${interaction.user.id}:${value}:heist`)
                  .setStyle(ButtonStyle.Success),
              ),
          ],
        });
        break;
      }

      case 'view': {
        const user = interaction.options.getUser('user', false) ?? interaction.user;

        DonateCommand.listPaginator.start(interaction, user.id);
        break;
      }

      case 'add': {
        const user = interaction.options.getUser('user', true);
        const userID = BigInt(user.id);
        const value = interaction.options.getNumber('quantity', true);

        const author = await interaction.guild.members.fetch(interaction.user.id);

        if (!author.roles.cache.has(CONFIG.ids.roles.dmc.giveawayManager)) {
          return void interaction.reply(ephemeralResponse('You do not have permission to do this.'));
        }

        await upsertUsers([ userID ]);
        await prismaClient.donation.create({
          data: {
            type: 'manual adjustment',
            userID,
            value,
          },
        });

        const total = (await prismaClient.donation.aggregate({
          _sum: {
            value: true,
          },
          where: {
            userID,
          },
        }))._sum.value;

        const member = await interaction.guild.members.fetch(userID.toString());

        const rolesToGive = Object
          .entries(CONFIG.ids.roles.dmc.sponsor)
          .filter(([ millions, roleID ]) =>
            total >= (BigInt(millions) * 1_000_000n) && !member.roles.cache.has(roleID),
          )
          .map(([ _, roleID ]) => roleID);

        if (rolesToGive.length > 0) {
          await member?.roles.add(rolesToGive);
        }

        interaction.reply(`Successfully added **${value.toLocaleString()}** to **${user.username}**'s total.`);
      }
    }
  }
}

