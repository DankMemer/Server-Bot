import { redisClient } from '../../../lib/redis-client';
import { Paginator, PaginatorContext, PaginatorOutput } from '../../../structures/paginator';
import { getUser } from '../../../utils/db';
import { getLevel } from '../../../utils/levels';

const POSITION_EMOJIS: string[] = [ '🥇', '🥈', '🥉' ];

export class LevelLeaderboardPaginator extends Paginator {
  public override id = 'level-leaderboard';
  public override itemsPerPage = 10;

  public async handle({ payload, interaction }: PaginatorContext): Promise<PaginatorOutput> {
    const userPosition = (await redisClient.zRevRank('xp-leaderboard', interaction.user.id.toString()) ?? -1) + 1;
    const positions = (await redisClient.zRangeWithScores('xp-leaderboard', 0, 500, {
      REV: true,
    })).map(p => ({
      userID: p.value,
      score: BigInt(p.score),
    }));

    const entries = await Promise.all(
      positions.map(position => getUser(position.userID)),
    );

    const users = positions
      .map((position, i) => ({
        ...position,
        entry: entries[i],
      }))
      .filter(user => user.score > 0);

    return {
      delimiter: '\n',
      items: users.map((user, i) =>
        `${POSITION_EMOJIS[i] ?? '🔹'} \` ${getLevel(user.score).toLocaleString()} \` - ${user.entry.username ?? user.userID}`,
      ),
      payload,
      embed: {
        title: 'Level Leaderboard',
        description: userPosition > 0
          ? `> Your position: #${userPosition.toLocaleString()}\n\n`
          : '',
      },
    };
  }
}
