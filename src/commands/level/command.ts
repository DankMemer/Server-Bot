
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { CONFIG } from '../../config';
import { redisClient } from '../../lib/redis-client';
import { Command, CommandContext } from '../../structures/command';
import { getUser } from '../../utils/db';
import { getLevel, getRequiredXP } from '../../utils/levels';
import { Colors } from '../../constants/colors';
import { LevelLeaderboardPaginator } from './paginators/leaderboard';

// let BG_IMAGE: Image;

// registerFont('./assets/level/Roboto-Regular.ttf', { family: 'Roboto Regular' });
// registerFont('./assets/level/Roboto-Bold.ttf', { family: 'Roboto Bold' });

export class LevelCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('level')
    .setDescription('View and manage levels')
    .addSubcommand(option =>
      option
        .setName('view')
        .setDescription('View level card')
        .addUserOption(subOption =>
          subOption
            .setName('user')
            .setDescription('User to check'),
        ),
    )
    .addSubcommand(option =>
      option
        .setName('leaderboard')
        .setDescription('View the leaderboard'),
    );

  public override servers = [ CONFIG.ids.servers.dmc ];

  public static paginator = new LevelLeaderboardPaginator();

  public override async execute({ interaction }: CommandContext): Promise<void | EmbedBuilder> {
    const action = interaction.options.getSubcommand();

    switch (action) {
      case 'leaderboard':
        return await LevelCommand.paginator.start(interaction);

      case 'view': {
        const user = interaction.options.getUser('user', false) ?? interaction.user;
        const entry = await getUser(user.id);
        const userPosition = (await redisClient.zRevRank('xp-leaderboard', user.id.toString()) ?? -1) + 1;

        const level = getLevel(entry.experience);
        const xpRequiredNext = getRequiredXP(level + 1);

        let xp = Number(entry.experience);

        // TODO: refactor
        for (let i = level; i > 0; i--) {
          xp -= getRequiredXP(i);
        }

        return new EmbedBuilder()
          .setThumbnail(user.avatarURL())
          .addFields(
            {
              name: 'Level',
              value: level.toLocaleString(),
              inline: true,
            },
            {
              name: 'XP',
              value: `${xp}/${xpRequiredNext}`,
              inline: true,
            },
            {
              name: 'Rank',
              value: userPosition === 0 ? 'N/A' : `#${userPosition.toLocaleString()}`,
              inline: false,
            },

          )
          .setColor(Colors.INVISIBLE);

        // const width = 934;
        // const height = 282;
        // const canvas = createCanvas(width, height);
        // const context = canvas.getContext('2d');

        // const level = getLevel(entry.experience);
        // const xpRequiredNext = getRequiredXP(level + 1);

        // let xp = Number(entry.experience);

        // // TODO: refactor
        // for (let i = level; i > 0; i--) {
        //   xp -= getRequiredXP(i);
        // }

        // // Background
        // BG_IMAGE ??= await loadImage(readFileSync('./assets/level/bg.png'));
        // context.drawImage(BG_IMAGE, 0, 0, width, height);

        // // Username
        // const usernameText = user.username;
        // context.textBaseline = 'bottom';
        // context.font = '42px "Roboto Bold"';
        // context.textAlign = 'start';
        // context.fillStyle = '#FFFFFF';
        // context.fillText(
        //   usernameText,
        //   302,
        //   100,
        // );

        // // Rank
        // const rankText = `Rank ${userPosition === 0 ? 'N/A' : `#${userPosition}`}`;
        // context.textBaseline = 'bottom';
        // context.font = '36px "Roboto Regular"';
        // context.fillStyle = '#FFFFFF';
        // context.textAlign = 'end';

        // context.fillText(
        //   rankText,
        //   865,
        //   100,
        // );

        // // Line
        // context.fillStyle = '#FFFFFF';
        // context.fillRect(302, 118, 563, 2);

        // // Level
        // const levelText = `Level ${level}`;
        // context.textBaseline = 'bottom';
        // context.font = '36px "Roboto Regular"';
        // context.fillStyle = '#FFFFFF';
        // context.textAlign = 'start';

        // context.fillText(
        //   levelText,
        //   302,
        //   180,
        // );

        // // XP
        // const xpText = `${xp}/${xpRequiredNext}`;
        // context.textBaseline = 'bottom';
        // context.font = '36px "Roboto Regular"';
        // context.fillStyle = '#FFFFFF';
        // context.textAlign = 'end';

        // context.fillText(
        //   xpText,
        //   865,
        //   180,
        // );

        // // Progress bar
        // context.fillStyle = '#1E1F22';
        // context.fillRect(302, 200, 563, 30);

        // context.fillStyle = '#659155';
        // context.fillRect(302, 200, 563 * (xp / xpRequiredNext), 30);

        // // Avatar
        // context.fillStyle = '#3133385 0';
        // context.save();
        // context.beginPath();
        // context.arc(61 + 100, 40 + 100, 100, 0, Math.PI * 2, false);
        // context.fill();
        // context.restore();

        // const avatarImage = await loadImage(user.displayAvatarURL({ extension: 'png', size: 512 }));

        // context.save();
        // context.beginPath();
        // context.arc(61 + 100, 40 + 100, 100, 0, Math.PI * 2, false);
        // context.clip();
        // context.drawImage(
        //   avatarImage,
        //   61,
        //   40,
        //   200,
        //   200,
        // );
        // context.restore();

        // await interaction.editReply({
        //   files: [
        //     {
        //       name: 'level.png',
        //       contentType: 'image/png',
        //       attachment: canvas.toBuffer(),
        //     },
        //   ],
        // });
      }
    }
  }
}

