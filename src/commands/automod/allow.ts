import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Colors } from '../../constants/colors';
import { logger } from '../../lib/logger';
import { addAllowedUrl, fetchUrlsFromDatabase, isUrlAllowed, removeAllowedUrl } from '../../utils/allowed-urls';
import { normalizeUrl } from '../../utils/url';

export async function handleAllowList(): Promise<EmbedBuilder> {
  try {
    const allowedUrls = await fetchUrlsFromDatabase();

    if (allowedUrls.length === 0) {
      return new EmbedBuilder()
        .setDescription('No allowed URLs found.')
        .setColor(Colors.BLUE);
    }

    const description = allowedUrls.map(url => `• ${url}`).join('\n');

    return new EmbedBuilder()
      .setTitle('Allowed URLs')
      .setDescription(description)
      .setColor(Colors.BLUE);
  } catch (error: any) {
    logger.error(error.stack);

    return new EmbedBuilder()
      .setDescription('An error occurred while listing allowed URLs.')
      .setColor(Colors.RED);
  }
}

export async function handleAllowAdd(interaction: ChatInputCommandInteraction): Promise<EmbedBuilder> {
  const url = interaction.options.getString('url', true);

  try {
    const normalizedUrl = normalizeUrl(url);

    const urlExists = await isUrlAllowed(normalizedUrl);

    if (urlExists) {
      return new EmbedBuilder()
        .setDescription(`\`${normalizedUrl}\` is already in the allowed URLs list.`)
        .setColor(Colors.BLUE);
    }

    await addAllowedUrl(normalizedUrl, interaction.user.id);

    return new EmbedBuilder()
      .setDescription(`Added \`${normalizedUrl}\` to the allowed URLs.`)
      .setColor(Colors.GREEN);
  } catch (error: any) {
    logger.error(error.stack);

    return new EmbedBuilder()
      .setDescription('An error occurred while adding the URL.')
      .setColor(Colors.RED);
  }
}

export async function handleAllowRemove(interaction: ChatInputCommandInteraction): Promise<EmbedBuilder> {
  const url = interaction.options.getString('url', true);

  try {
    const normalizedUrl = normalizeUrl(url);

    await removeAllowedUrl(normalizedUrl);

    return new EmbedBuilder()
      .setDescription(`Removed \`${normalizedUrl}\` from the allowed URLs.`)
      .setColor(Colors.GREEN);
  } catch (error: any) {
    logger.error(error.stack);

    return new EmbedBuilder()
      .setDescription('An error occurred while removing the URL.')
      .setColor(Colors.RED);
  }
}
