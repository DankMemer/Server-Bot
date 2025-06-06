import { ActionRowBuilder, AuditLogEvent, ButtonBuilder, ButtonStyle, EmbedBuilder, TextChannel } from 'discord.js';
import HolyTime from 'holy-time';
import { CONFIG } from '../../../config';
import { Colors } from '../../../constants/colors';
import { discordClient } from '../../../lib/discord-client';
import { redisClient } from '../../../lib/redis-client';
import { Modal, ModalContext } from '../../../structures/modal';
import { ephemeralResponse } from '../../../utils/format';

export class HelpDeskAppealModal extends Modal {
  public override id = 'helpdesk-appeal';

  public override async execute({ interaction }: ModalContext): Promise<void> {
    const appeal =	interaction.fields.getTextInputValue('appeal');

    const guild = discordClient.bot.guilds.resolve(CONFIG.ids.servers.dmc);
    const channel = discordClient.bot.channels.resolve(CONFIG.ids.channels.dmc.appeals) as TextChannel;
    const banReason = (await guild.bans.fetch(interaction.user.id).catch(() => null))?.reason ?? 'Unknown';


    channel.send({
      content: interaction.user.id,
      embeds: [
        new EmbedBuilder({
          title: 'Ban Appeal',
          author: {
            name: interaction.user.username,
            iconURL: interaction.user.avatarURL(),
          },
          description: appeal,
          color: Colors.INVISIBLE,
          fields: [
            {
              name: 'Ban Reason',
              value: banReason,
            },
          ],
        }),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`helpdesk-appealupdate:${interaction.user.id}:deny`)
              .setStyle(ButtonStyle.Danger)
              .setLabel('Deny'),
            new ButtonBuilder()
              .setCustomId(`helpdesk-appealupdate:${interaction.user.id}:accept`)
              .setStyle(ButtonStyle.Success)
              .setLabel('Accept'),
          ),
      ],
    });

    await redisClient.setEx(`appeal-cooldown:${interaction.user.id}`, HolyTime.Units.WEEK * 2 / HolyTime.Units.SECOND, '1');

    interaction.reply(ephemeralResponse('Your appeal has been sent!'));
  }
}
