import { ActionRowBuilder, ChannelType, EmbedBuilder, SlashCommandBuilder, StringSelectMenuBuilder, TextChannel } from 'discord.js';
import { CONFIG } from '../../config';
import { Colors } from '../../constants/colors';
import { discordClient } from '../../lib/discord-client';
import { Command, CommandContext } from '../../structures/command';
import { ephemeralResponse } from '../../utils/format';
import { HELP_DESK_OPTIONS } from './constants';

export class HelpDeskCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('helpdesk')
    .setDescription('Post help desk message')
    .addChannelOption(option =>
      option
        .setName('channel')
        .addChannelTypes(ChannelType.GuildText)
        .setDescription('Desired channel')
        .setRequired(true),
    );
  public override servers = [ CONFIG.ids.servers.dmo ];
  public override execute({ interaction }: CommandContext): void {
    const selectedChannel = interaction.options.getChannel('channel', true);
    const channel = discordClient.bot.channels.resolve(selectedChannel.id) as TextChannel;

    channel.send({
      embeds: [
        new EmbedBuilder({
          title: 'Dank Memer Support | Help Desk',
          description: 'Please choose an option from the select menu below if you need help.',
          color: Colors.GREEN,
          thumbnail: {url: 'https://dankmemer.lol/img/memer.webp'}
        }),
      ],
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>()
          .addComponents(
        	new StringSelectMenuBuilder()
              .setCustomId('helpdesk-option')
              .addOptions(
                HELP_DESK_OPTIONS.map(option => ({
                  label: option.name,
                  value: option.name,
                  description: option.description,
                })),
              ),
          ),
      ],
    });

    interaction.reply(ephemeralResponse('Created!'));
  }
}

