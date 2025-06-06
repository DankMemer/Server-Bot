import HolyTime from 'holy-time';
import { prismaClient } from '../../../lib/prisma-client';
import { Widget } from '../../../lib/widgets';
import { Paginator, PaginatorContext, PaginatorOutput } from '../../../structures/paginator';
import { DiscordTimestampFormat, formatDiscordTimestamp } from '../../../utils/time';

export class DonateListPaginator extends Paginator {
  public override id = 'donate-list';
  public override itemsPerPage = 5;

  public async handle({ payload }: PaginatorContext): Promise<PaginatorOutput> {
    const donations = await prismaClient.donation.findMany({
      where: {
        userID: BigInt(payload),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const total = donations.reduce((a, b) => a + b.value, 0n);

    return {
      delimiter: '\n\n',
      items: donations.map(donation =>
        `**${donation.value.toLocaleString()}**\n` +
        Widget.replyList([
          `Date: ${formatDiscordTimestamp(new HolyTime(donation.createdAt), DiscordTimestampFormat.SHORT_DATE_TIME)}`,
          `Type: ${donation.type}`,
        ]),
      ),
      payload,
      embed: {
        title: 'Donations',
        description:
          `:person_tipping_hand: <@${payload}> ${payload}\n` +
          `:money_with_wings: ${total.toLocaleString()}\n\n`,
      },
    };
  }
}
