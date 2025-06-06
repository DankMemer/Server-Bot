import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { CONFIG } from '../../../config';
import { Colors } from '../../../constants/colors';
import { prismaClient } from '../../../lib/prisma-client';
import { Component, ComponentContext } from '../../../structures/component';
import { upsertUsers } from '../../../utils/db';
import { ephemeralResponse } from '../../../utils/format';

export class DonateGiveawayComponent extends Component {
  public override id = 'donate-accept';

  public override async execute({ interaction }: ComponentContext): Promise<void> {
    const userID = BigInt(interaction.customId.split(':')[1]);
    const value = BigInt(interaction.customId.split(':')[2]);
    const type = interaction.customId.split(':')[3];

    const author = await interaction.guild.members.fetch(interaction.user.id);

    if (!author.roles.cache.has(CONFIG.ids.roles.dmc.giveawayManager)) {
      return void interaction.reply(ephemeralResponse('You do not have permission to do this.'));
    }

    await upsertUsers([ userID ]);
    await prismaClient.donation.create({
      data: {
        type,
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

    interaction.update({
      content: interaction.message.content,
      embeds: interaction.message.embeds.map(embed =>
        new EmbedBuilder(embed.data)
          .setColor(Colors.GREEN),
      ),
      components: [
        new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setLabel('Accept')
              .setCustomId('donate-accept')
              .setStyle(ButtonStyle.Success)
              .setDisabled(true),
          ),
      ],
    });
  }
}
