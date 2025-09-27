import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Colors } from '../../constants/colors';
import { addAllowedUrl, fetchUrlsFromDatabase, isUrlAllowed, removeAllowedUrl } from '../../utils/allowed-urls';
import { normalizeUrl } from '../../utils/url';

export async function handleAllowList(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const allowedUrls = await fetchUrlsFromDatabase();

    if (allowedUrls.length === 0) {
      const embed = new EmbedBuilder()
        .setDescription('No allowed URLs found.')
        .setColor(Colors.BLUE);

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const description = allowedUrls.map(url => `• ${url}`).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('Allowed URLs')
      .setDescription(description)
      .setColor(Colors.BLUE);

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    const embed = new EmbedBuilder()
      .setDescription('An error occurred while listing allowed URLs.')
      .setColor(Colors.RED);

    await interaction.editReply({ embeds: [embed] });
  }
}

export async function handleAllowAdd(interaction: ChatInputCommandInteraction): Promise<void> {
  const url = interaction.options.getString('url', true);

  try {
    const normalizedUrl = normalizeUrl(url);

    const urlExists = await isUrlAllowed(normalizedUrl);

    if (urlExists) {
      const embed = new EmbedBuilder()
        .setDescription(`\`${normalizedUrl}\` is already in the allowed URLs list.`)
        .setColor(Colors.BLUE);

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    await addAllowedUrl(normalizedUrl, interaction.user.id);

    const embed = new EmbedBuilder()
      .setDescription(`Added \`${normalizedUrl}\` to the allowed URLs.`)
      .setColor(Colors.GREEN);

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    const embed = new EmbedBuilder()
      .setDescription('An error occurred while adding the URL.')
      .setColor(Colors.RED);

    await interaction.editReply({ embeds: [embed] });
  }
}

export async function handleAllowRemove(interaction: ChatInputCommandInteraction): Promise<void> {
  const url = interaction.options.getString('url', true);

  try {
    const normalizedUrl = normalizeUrl(url);

    await removeAllowedUrl(normalizedUrl);

    const embed = new EmbedBuilder()
      .setDescription(`Removed \`${normalizedUrl}\` from the allowed URLs.`)
      .setColor(Colors.GREEN);

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    const embed = new EmbedBuilder()
      .setDescription('An error occurred while removing the URL.')
      .setColor(Colors.RED);

    await interaction.editReply({ embeds: [embed] });
  }
}
