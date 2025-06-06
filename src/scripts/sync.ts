import { REST, Routes } from 'discord.js';
import { Commands } from '../commands';
import { CONFIG } from '../config';
import { logger } from '../lib/logger';

const RestAPI = new REST({ version: '9' }).setToken(CONFIG.discord.token);

async function init(): Promise<void> {
  for (const server of Object.values(CONFIG.ids.servers)) {
    const commands = [ ...Commands.values() ]
      .filter((command) => command.servers.includes(server))
      .map(command => command.data.toJSON());

    if (commands.length === 0) {
      continue;
    }

    try {
      await RestAPI.put(
        Routes.applicationGuildCommands(
          CONFIG.discord.id,
          server,
        ),
        {
          body: commands,
        },
      );
      logger.info(`Registered slash commands for '${server}'`);
    } catch (error) {
      logger.error(error.message);
    }
  }
}

if (require.main === module) {
  init()
    .catch(error => {
      logger.error(`Failed to init: ${error}`);
    });
}

