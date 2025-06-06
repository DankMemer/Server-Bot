import { EmbedBuilder, SlashCommandBuilder, TextChannel } from 'discord.js';
import { CONFIG } from '../config';
import { Command, CommandContext } from '../structures/command';
import { ephemeralResponse } from '../utils/format';
import { discordClient } from '../lib/discord-client';
import { Colors } from '../constants/colors';

export class HeistDonateCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('heistdonate')
    .setDescription('Express your interest in donating to the heist')
    .addNumberOption(subOption =>
      subOption
        .setName('amount')
        .setDescription('How much do you want to donate?')
        .setRequired(true),
    );
  public override servers = [ CONFIG.ids.servers.dmc ];
  public override execute = async ({ interaction }: CommandContext): Promise<void> => {
    const amount = interaction.options.getNumber('amount', true);
    const channel = discordClient.bot.channels.resolve(CONFIG.ids.channels.dmc.heistRequests) as TextChannel;

    await channel.send({
      embeds: [
        new EmbedBuilder({
          author: {
            name: `${interaction.user.username} (${interaction.user.id})`,
            icon_url: interaction.user.avatarURL(),
          },
          color: Colors.INVISIBLE,
          description: amount.toLocaleString(),
          timestamp: new Date(),

        }),
      ],
    });

    await interaction.reply(ephemeralResponse('Notified the team!'));
  };
}

