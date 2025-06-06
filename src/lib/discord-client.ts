import { readdirSync } from 'node:fs';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { CONFIG } from '../config';
import { logger } from './logger';

class DiscordClient {
  public bot: Client;

  constructor() {
    this.bot = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
      ],
      allowedMentions: {
        repliedUser: false,
        parse: [ 'users' ],
      },
      partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
      ],
    });
  }

  public async connect(): Promise<void> {
    this.loadEvents();
    await this.bot.login(CONFIG.discord.token);
    this.cacheAllMembers();
  }

  public async cacheAllMembers(): Promise<void> {
    for (const server of Object.values(CONFIG.ids.servers)) {
      try {
        const guild = await this.bot.guilds.fetch(server);

        if (!guild) {
          logger.error(`Failed to find guild '${server}'`);
          continue;
        }

        await guild.members.fetch();

        logger.info(`Successfully cached all members of '${server}'`);
      } catch (error) {
        logger.error(`Error while fetching all members for '${server}': ${error.message}`);
      }
    }
  }

  private loadEvents(): void {
    const events = readdirSync('./src/events')
      .map((event) => event.replaceAll('.ts', ''));

    events.forEach((event) => {
      this.bot.removeAllListeners(event);
      this.bot.on(event, require(`../events/${event}`).default);
    });
  }
}

export const discordClient = new DiscordClient();
