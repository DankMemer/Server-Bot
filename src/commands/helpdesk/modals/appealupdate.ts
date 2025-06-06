import { EmbedBuilder, TextChannel } from 'discord.js';
import { CONFIG } from '../../../config';
import { Colors } from '../../../constants/colors';
import { discordClient } from '../../../lib/discord-client';
import { Modal, ModalContext } from '../../../structures/modal';

export class HelpDeskAppealUpdateModal extends Modal {
  public override id = 'helpdesk-appealupdate';

  public override async execute({ interaction }: ModalContext): Promise<void> {
    const message =	interaction.fields.getTextInputValue('message');
    const userID = interaction.customId.split(':')[1];
    const accepted = interaction.customId.split(':')[2] === 'true';

    const logChannel = discordClient.bot.channels.resolve(CONFIG.ids.channels.dmc.appealLogs) as TextChannel;
    const guild = discordClient.bot.guilds.resolve(CONFIG.ids.servers.dmc);
    const user = await discordClient.bot.users.fetch(userID);

    if (accepted) {
      await guild.members.unban(userID, 'Appealed').catch(() => {});
      await user?.send({
        embeds: [
          new EmbedBuilder({
            color: Colors.GREEN,
            title: 'DMC Appeal Accepted',
            description:
              'You have been unbanned from Dank Memer Community!\nYou may join back now: https://discord.gg/memers' +
              (message ? `\n\n**Message from the moderator:**\n${message}` : ''),
          }),
        ],
      }).catch(() => {});
    } else {
      await user?.send({
        embeds: [
          new EmbedBuilder({
            color: Colors.RED,
            title: 'DMC Appeal Denied',
            description:
             'You may try to appeal again two weeks after your first appeal. Do not contact moderators to try and bypass this.' +
             (message ? `\n\n**Message from the moderator:**\n${message}` : ''),
          }),
        ],
      }).catch(() => {});
    }

    logChannel.send({
      embeds: [
        new EmbedBuilder({
          author: {
            name: `${user.username}'s (${user.id}) appeal was ${accepted ? 'accepted' : 'denied'}`,
            iconURL: user?.avatarURL() ?? '',
          },
          footer: {
            text: `by ${interaction.user.username} (${interaction.user.id})`,
            iconURL: interaction.user.avatarURL(),
          },
          color: accepted
            ? Colors.GREEN
            : Colors.RED,
        }),
      ],
    });

    if (interaction.isFromMessage()) {
      interaction.update({
        content: interaction.message.content,
        embeds: interaction.message.embeds.map(embed =>
          new EmbedBuilder(embed.data)
            .setColor(
              accepted
                ? Colors.GREEN
                : Colors.RED,
            ),
        ),
        components: [],
      });
    }
  }
}
