import { TextChannel } from 'discord.js';
import { CONFIG } from '../../../config';
import { discordClient } from '../../../lib/discord-client';
import { redisClient } from '../../../lib/redis-client';
import { Component, ComponentContext } from '../../../structures/component';
import { ephemeralResponse } from '../../../utils/format';
import {
  SUPPORT_COOLDOWN_SECONDS,
  SUPPORT_LOG_CHANNEL_ID,
  supportCooldownKey,
} from '../support';

export class HelpDeskNevermindComponent extends Component {
  public override id = 'helpdesk-nevermind';

  public override async execute({ interaction }: ComponentContext): Promise<void> {
    const userID = interaction.customId.split(':')[1];

    if (interaction.user.id !== userID) {
      return void interaction.reply(ephemeralResponse('Only the person who requested support can use this button.'));
    }

    await interaction.deferUpdate();
    const member = await interaction.guild.members.fetch(userID);

    await member.roles.remove(CONFIG.ids.roles.dmo.support);
    await redisClient.setEx(supportCooldownKey(userID), SUPPORT_COOLDOWN_SECONDS, '1');
    await interaction.message.delete();

    const logChannel = await discordClient.bot.channels.fetch(SUPPORT_LOG_CHANNEL_ID) as TextChannel;

    await logChannel.send({
      content: `<@${userID}> removed their own support channel role.`,
      allowedMentions: { parse: [] },
    });
  }
}
