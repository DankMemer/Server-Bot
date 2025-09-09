
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { CONFIG } from '../config';
import { Colors } from '../constants/colors';
import { Command, CommandContext } from '../structures/command';
import { canDmUser } from '../utils/moderation';

export class DmCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('dm')
    .setDescription('Dm a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to dm')
        .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('Message to dm')
        .setRequired(true),
    )
    .addBooleanOption(option =>
      option
        .setName('sign')
        .setDescription('Whether to sign the dm')
        .setRequired(true),
    );

  public override servers = [CONFIG.ids.servers.dmc, CONFIG.ids.servers.dmo];

  public override execute = async ({ interaction }: CommandContext): Promise<void> => {
    const staff = interaction.guild.members.resolve(interaction.user.id);

    if (!staff || !canDmUser(staff)) {
      await interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true,
      });
      return;
    }

    const target = interaction.options.getUser('user', true);
    const message = interaction.options.getString('message', true);
    const signed = interaction.options.getBoolean('sign', true);

    try {
      await target.send({
        embeds: [
          new EmbedBuilder({
            author: {
              name: `You've received a message from a staff member in ${interaction.guild.name}`,
              icon_url: interaction.guild.iconURL(),
            },
            color: Colors.INVISIBLE,
            description: message,
            footer: {
              text: signed
                ? `Sent by ${interaction.user.username}`
                : '',
            },
          }),
        ],
      });
    } catch {
      await interaction.reply({
        content: 'Failed to send a DM.',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: 'DM sent.',
      ephemeral: true,
    });
  };
}

