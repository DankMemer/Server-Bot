import { ActionRowBuilder, ModalBuilder, SelectMenuInteraction, TextChannel, TextInputBuilder, TextInputStyle } from 'discord.js';
import { CONFIG } from '../../../config';
import { discordClient } from '../../../lib/discord-client';
import { redisClient } from '../../../lib/redis-client';
import { Component, ComponentContext } from '../../../structures/component';
import { ephemeralResponse } from '../../../utils/format';
import { HELP_DESK_OPTIONS } from '../constants';
import { buildSupportMessage, SUPPORT_BLOCKED_ROLE_ID, SUPPORT_CHANNEL_ID, supportCooldownKey } from '../support';

export class HelpDeskOptionComponent extends Component {
  public override id = 'helpdesk-option';

  public override async execute({ interaction }: ComponentContext): Promise<void> {
    const selected = (interaction as SelectMenuInteraction).values[0];
    const option = HELP_DESK_OPTIONS.find(o => o.name === selected);

    if (option.name === 'DMC Appeal') {
      if (await redisClient.get(`appeal-cooldown:${interaction.user.id}`)) {
        return void interaction.reply(ephemeralResponse('You can only appeal once every two weeks!'));
      }

      return await interaction.showModal(
        new ModalBuilder()
          .setTitle('DMC Appeal')
          .setCustomId('helpdesk-appeal')
          .addComponents(
            new ActionRowBuilder<TextInputBuilder>()
              .addComponents(
                new TextInputBuilder()
                  .setCustomId('appeal')
                  .setLabel('Your appeal:')
                  .setMinLength(100)
                  .setStyle(TextInputStyle.Paragraph),
              ),
          ),
      );
    }

    if (option.name === 'Other') {
      const member = await interaction.guild.members.fetch(interaction.user.id);

      if (member.roles.cache.has(SUPPORT_BLOCKED_ROLE_ID)) {
        return void interaction.reply(ephemeralResponse('You are not able to access personal support anymore'));
      }

      if (await redisClient.get(supportCooldownKey(interaction.user.id))) {
        return void interaction.reply(ephemeralResponse('You must wait 5 minutes before returning to the support channel.'));
      }
    }

    if (option.role) {
      const isSupportOption = option.role === CONFIG.ids.roles.dmo.support;

      if (isSupportOption) {
        await interaction.deferReply({ ephemeral: true });
      }

      const member = await interaction.guild.members.fetch(interaction.user.id);
      const alreadyHasRole = member.roles.cache.has(option.role);

      await member.roles.add(option.role);

      if (isSupportOption && !alreadyHasRole) {
        try {
          const supportChannel = await discordClient.bot.channels.fetch(SUPPORT_CHANNEL_ID) as TextChannel;

          await supportChannel.send(buildSupportMessage(interaction.user.id, true));
        } catch (error) {
          await member.roles.remove(option.role);
          throw error;
        }
      }

      if (isSupportOption) {
        await interaction.editReply({ embeds: ephemeralResponse(option.response).embeds });
        return;
      }
    }

    await interaction.reply(ephemeralResponse(option.response));
  }
}
