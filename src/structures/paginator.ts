import { User } from '@prisma/client';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Interaction, InteractionReplyOptions, MessageComponentInteraction, StringSelectMenuBuilder, StringSelectMenuInteraction } from 'discord.js';
import { Promisable } from 'type-fest';
import { Colors } from '../constants/colors';
import { Emojis } from '../constants/emojis';
import { getUser } from '../utils/db';

export type PaginatorContext = {
  index: number;
  interaction: Interaction;
  userEntry: User;
  filters: string[];
  payload?: string;
};

export type PaginatorOutput = {
  delimiter: string;
  payload: string;
  items: string[];
  embed?: {
    title?: string;
    description?: string;
  };
};

export abstract class Paginator {
  public abstract id: string;
  public abstract itemsPerPage: number;
  public filters?: Record<string, string>;
  public abstract handle(context: PaginatorContext): Promisable<PaginatorOutput>;

  private render(
    { index, filters, interaction }: PaginatorContext,
    { delimiter, payload, items, embed }: PaginatorOutput,
  ): InteractionReplyOptions {
    const totalItems = items.length;
    const currentPage = Math.floor(index / this.itemsPerPage) + 1;
    const totalPages = Math.ceil(totalItems / this.itemsPerPage);

    const paginatorEmbed = new EmbedBuilder({
      title: embed?.title ?? '',
      description:
        (embed?.description ?? '') +
        items
          .slice(index, index + this.itemsPerPage)
          .join(delimiter),
      color: Colors.INVISIBLE,
      footer: {
        text: `${totalPages > 0 ? `Page ${currentPage} of ${totalPages}` : 'Empty'}`,
      },
    });

    const rows: Array<ActionRowBuilder<ButtonBuilder|StringSelectMenuBuilder>> = [];

    if (Object.keys(this.filters ?? {}).length > 0) {
      rows.push(new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
        	new StringSelectMenuBuilder()
            .setCustomId(`pg:f:${this.id}:${interaction.user.id}:${payload}`)
            .setMinValues(0)
            .setMaxValues(Object.keys(this.filters).length)
            .addOptions(
              Object
                .entries(this.filters)
                .map(([ value, label ]) => ({ label, value, default: filters.includes(value) })),
            ),
        ),
      );
    }

    const prefix = `pg:n:${this.id}:${interaction.user.id}:${payload ?? ''}:${filters.join(',')}`;

    rows.push(new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setEmoji(Emojis.doubleArrowLeft)
          .setCustomId(`${prefix}:0`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage <= 1),
        new ButtonBuilder()
          .setEmoji(Emojis.arrowLeft)
          .setCustomId(`${prefix}:${Math.max(0, index - this.itemsPerPage)}.0`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage <= 1),
        new ButtonBuilder()
          .setEmoji(Emojis.arrowRight)
          .setCustomId(`${prefix}:${index + this.itemsPerPage}.00`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage >= totalPages),
        new ButtonBuilder()
          .setEmoji(Emojis.doubleArrowRight)
          .setCustomId(`${prefix}:${(totalPages - 1) * this.itemsPerPage}.000`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage >= totalPages),
      ),
    );

    return {
      embeds: [ paginatorEmbed ],
      components: rows,
    };
  }

  public async getMenu(interaction: Interaction, payload?: string): Promise<InteractionReplyOptions> {
    const userEntry = await getUser(interaction.user.id);
    const input: PaginatorContext = {
      index: 0,
      userEntry,
      interaction,
      filters: [],
      payload,
    };

    const output = await this.handle(input);

    input.index = this.getIndex(input.index, output.items.length);

    return this.render(input, output);
  }

  private getIndex(baseIndex: number, totalItems: number): number {
    return Math.max(0, Math.min(baseIndex, (Math.ceil(totalItems / this.itemsPerPage) - 1) * this.itemsPerPage));
  }

  public async start(interaction: Interaction, payload?: string): Promise<void> {
    if (interaction.isRepliable()) {
      interaction.reply(await this.getMenu(interaction, payload));
    }
  }

  public async onInteraction(interaction: MessageComponentInteraction): Promise<void> {
    const data = interaction.customId.split(':');
    const type = data[1];
    const userID = data[3];
    const payload = data[4];

    if (userID !== interaction.user.id) {
      // TODO: ephemeral response
      return void interaction.reply({
        content: 'This is not your menu',
        ephemeral: true,
      });
    }

    const userEntry = await getUser(interaction.user.id);
    const input: PaginatorContext = {
      index: 0,
      interaction: interaction as Interaction,
      userEntry,
      filters: [],
      payload,
    };

    if (type === 'f') {
      input.filters = interaction instanceof StringSelectMenuInteraction ? interaction.values : [];
    } else {
      input.index = Number(data[6]);
      input.filters = data[5] ? data[5].split(',').filter(Boolean) : [];
    }

    const output = await this.handle(input);
    input.index = this.getIndex(input.index, output.items.length);

    const render = this.render(input, output);

    interaction.update({
      embeds: render.embeds,
      components: render.components,
    });
  }
}
