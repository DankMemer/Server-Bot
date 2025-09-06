import { ChannelType, EmbedBuilder } from 'discord.js';
import { Colors } from '../../../constants/colors';
import { prismaClient } from '../../../lib/prisma-client';
import { Component, ComponentContext } from '../../../structures/component';
import { ephemeralResponse } from '../../../utils/format';
import { canManageLockdown } from '../../../utils/moderation';

export class LockdownConfirmComponent extends Component {
  public override id = 'lockdown-confirm';

  public override async execute({ interaction }: ComponentContext): Promise<void> {
    if (interaction.user.id !== interaction.customId.split(':')[1]) {
      return void interaction.reply(ephemeralResponse('You cannot do this.'));
    }

    const moderatorMember = interaction.guild.members.resolve(interaction.user.id);
    
    if (!moderatorMember || !canManageLockdown(moderatorMember)) {
      return void interaction.reply(ephemeralResponse('You do not have permission to manage lockdown.'));
    }

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('Lockdown')
          .setDescription('Processing...')
          .setColor(Colors.YELLOW),
      ],
      components: [],
    });

    const channels = await prismaClient.lockdownChannel.findMany({
      where: {
        guildID: BigInt(interaction.guild.id),
      },
    });

    const lockdown = channels.some(lockdownChannel => lockdownChannel.locked);

    for (const channel of channels.filter(c => lockdown ? c.locked : true)) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      await prismaClient.lockdownChannel.update({
        where: {
          id: channel.id,
        },
        data: {
          locked: !lockdown,
        },
      });

      const discordChannel = interaction.guild.channels.resolve(channel.id.toString());

      if (!discordChannel) {
        continue;
      }

      if (discordChannel.type === ChannelType.GuildText) {
        await discordChannel.permissionOverwrites.edit(
          interaction.guild.id,
          {
            SendMessages: !!lockdown,
          },
          {
            reason: `/lockdown server by @${interaction.user.username} (${interaction.user.id})`,
          },
        );
      } else if (discordChannel.type === ChannelType.GuildVoice) {
        await discordChannel.permissionOverwrites.edit(
          interaction.guild.id,
          {
            Connect: !!lockdown,
          },
          {
            reason: `/lockdown channel by @${interaction.user.username} (${interaction.user.id})`,
          },
        );
      }

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Lockdown')
            .setDescription(`Done ${lockdown ? 'unlocking' : 'locking'} the server`)
            .setColor(Colors.GREEN),
        ],
        components: [],
      });
    }
  }
}
