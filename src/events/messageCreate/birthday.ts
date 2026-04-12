import { Message } from 'discord.js';
import { CONFIG } from '../../config';
import { prismaClient } from '../../lib/prisma-client';

const BIRTHDAY_DURATION_MS = 86_400_000;

let cachedDayExpiry = 0;
let cachedMonth = -1;
let cachedDay = -1;
let cachedYear = -1;
const checkedToday = new Set<string>();

function refreshDay(now: number): void {
  if (now < cachedDayExpiry) {
    return;
  }

  const d = new Date(now);
  cachedMonth = d.getUTCMonth();
  cachedDay = d.getUTCDate();
  cachedYear = d.getUTCFullYear();
  cachedDayExpiry = Date.UTC(cachedYear, cachedMonth, cachedDay + 1);
  checkedToday.clear();
}

export async function birthdayHandler(message: Message): Promise<void> {
  if (message.author.bot) {
    return;
  }

  if (message.guild?.id !== CONFIG.ids.servers.dmc) {
    return;
  }

  const authorID = message.author.id;

  if (checkedToday.has(authorID)) {
    return;
  }

  checkedToday.add(authorID);

  const joinedTimestamp = message.member?.joinedTimestamp;
  if (!joinedTimestamp) {
    return;
  }

  refreshDay(Date.now());

  const joined = new Date(joinedTimestamp);
  if (joined.getUTCMonth() !== cachedMonth || joined.getUTCDate() !== cachedDay) {
    return;
  }

  const years = cachedYear - joined.getUTCFullYear();
  if (years < 1) {
    return;
  }

  const birthdayRoleID = CONFIG.ids.roles.dmc.birthday;
  if (message.member.roles.cache.has(birthdayRoleID)) {
    return;
  }

  const expiresAt = new Date(Date.now() + BIRTHDAY_DURATION_MS);
  const relativeTimestamp = `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`;

  try {
    await message.member.roles.add(birthdayRoleID, 'Server birthday');

    await prismaClient.birthdayRole.upsert({
      where: {
        userID_guildID: {
          userID: BigInt(authorID),
          guildID: BigInt(message.guild.id),
        },
      },
      create: {
        userID: BigInt(authorID),
        guildID: BigInt(message.guild.id),
        expiresAt,
      },
      update: {
        expiresAt,
      },
    });

    await message.reply({
      content: `🎉 **Happy ${years} Year Server Birthday!** 🎉\n\n`
        + `To celebrate, you've been given the <@&${birthdayRoleID}> role — `
        + `it will be automatically removed ${relativeTimestamp}. Enjoy!`,
      allowedMentions: {
        repliedUser: true,
        roles: [],
      },
    });
  } catch {
    checkedToday.delete(authorID);
  }
}
