import * as dotenv from 'dotenv';
import { logger } from './lib/logger';

dotenv.config();

type Type = {
  string: string;
  number: number;
  boolean: boolean;
};

export const CONFIG = {
  discord: {
    token: variable('DISCORD_TOKEN', 'string'),
    id: variable('DISCORD_ID', 'string'),
  },
  redis: {
    url: variable('REDIS_URL', 'string'),
    password: variable('REDIS_PASSWORD', 'string', true),
  },
  postgres: {
    host: variable('POSTGRES_HOST', 'string'),
    post: variable('POSTGRES_PORT', 'number'),
    username: variable('POSTGRES_USERNAME', 'string'),
    password: variable('POSTGRES_PASSWORD', 'string'),
    dbname: variable('POSTGRES_DBNAME', 'string'),
  },
  memer: {
    apiUrl: variable('MEMER_API_URL', 'string'),
    token: variable('MEMER_TOKEN', 'string'),
  },
  openai: {
    key: variable('OPENAI_KEY', 'string', true),
  },
  ids: {
    channels: {
      dmc: {
        prestigeOmegaHere: variable('IDS_CHANNELS_DMC_PRESTIGE_OMEGA_HERE', 'string'),
        vote: variable('IDS_CHANNELS_DMC_VOTE', 'string'),
        modLogs: variable('IDS_CHANNELS_DMC_MOD_LOGS', 'string'),
        reports: variable('IDS_CHANNELS_DMC_REPORTS', 'string'),
        starboard: variable('IDS_CHANNELS_DMC_STARBOARD', 'string'),
        appeals: variable('IDS_CHANNELS_DMC_APPEALS', 'string'),
        appealLogs: variable('IDS_CHANNELS_DMC_APPEAL_LOGS', 'string'),
        premium: variable('IDS_CHANNELS_DMC_PREMIUM', 'string'),
        premiumSupport: variable('IDS_CHANNELS_DMC_PREMIUM_SUPPORT', 'string'),
        chadCategory: variable('IDS_CHANNELS_DMC_CHAD_CATEGORY', 'string'),
        heistRequests: variable('IDS_CHANNELS_DMC_HEIST_REQUESTS', 'string'),
      },
    },
    roles: {
      dmo: {
        support: variable('IDS_ROLES_DMO_SUPPORT', 'string'),
        assist: variable('IDS_ROLES_DMO_ASSIST', 'string'),
        moderator: variable('IDS_ROLES_DMO_MODERATOR', 'string'),
      },
      dmc: {
        moderator: variable('IDS_ROLES_DMC_MODERATOR', 'string'),
        supportModerator: variable('IDS_ROLES_DMC_SUPPORT_MODERATOR', 'string'),
        trialModerator: variable('IDS_ROLES_DMC_TRIAL_MODERATOR', 'string'),
        randomColor: variable('IDS_ROLES_DMC_RANDOM_COLOR', 'string'),
        team: variable('IDS_ROLES_DMC_TEAM', 'string'),
        giveawayManager: variable('IDS_ROLES_DMC_GIVEAWAY_MANAGER', 'string'),
        sponsor: {
          10: variable('IDS_ROLES_DMC_SPONSOR_10', 'string'),
          15: variable('IDS_ROLES_DMC_SPONSOR_15', 'string'),
          25: variable('IDS_ROLES_DMC_SPONSOR_25', 'string'),
          50: variable('IDS_ROLES_DMC_SPONSOR_50', 'string'),
        },
        levels: {
          10: variable('IDS_ROLES_DMC_LEVEL_10', 'string'),
          15: variable('IDS_ROLES_DMC_LEVEL_15', 'string'),
          20: variable('IDS_ROLES_DMC_LEVEL_20', 'string'),
          25: variable('IDS_ROLES_DMC_LEVEL_25', 'string'),
          50: variable('IDS_ROLES_DMC_LEVEL_50', 'string'),
          75: variable('IDS_ROLES_DMC_LEVEL_75', 'string'),
          100: variable('IDS_ROLES_DMC_LEVEL_100', 'string'),
        },
        chad: variable('IDS_ROLES_DMC_CHAD', 'string'),
      },
    },
    servers: {
      dmc: variable('IDS_SERVERS_DMC', 'string'),
      dmo: variable('IDS_SERVERS_DMO', 'string'),
      dms: variable('IDS_SERVERS_DMS', 'string'),
    },
  },
  prismaDatabaseURL: variable('PRISMA_DATABASE_URL', 'string'),
} as const;

function variable<T extends keyof Type>(name: Uppercase<string>, t: T, optional = false): Type[T] {
  if (!(name in process.env)) {
    if (!optional) {
      logger.error(`Variable "${name}" not specified in .env`);
      process.exit(1);
    } else {
      return null;
    }
  }

  let environmentVariable: any = process.env[name];

  switch (t) {
    case 'number': {
      environmentVariable = Number(environmentVariable);
      break;
    }

    case 'boolean': {
      environmentVariable = Boolean(environmentVariable);
      break;
    }
  }

  return environmentVariable as unknown as Type[T];
}

