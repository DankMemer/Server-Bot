<img width="64" height="64" align="left" style="float: left; margin: 10px 10px 0 0;" alt="Icon" src="https://imgur.com/WjBycLW.png">

# Community Bot

## Deploying updates and syncing slash commands

Run these commands from the bot directory on the server, with the usual production `.env` available:

```sh
git pull
npm install
npm run sync
```

Then restart the bot using your usual process manager, for example `pm2 restart server-bot`. Install dependencies before compiling to pick up the libraries and project compiler used by `/roles`. Node.js 18.17 or newer is required.

`npm run sync` compiles TypeScript using the project compiler and registers this bot's commands in the configured servers. Check for `Registered slash commands for '<server ID>'` in its output. If you prefer separate steps, run `npx tsc` followed by `node dist/scripts/sync.js`. Run command syncing when adding or changing a command's definition; ordinary implementation changes only need compilation and a restart.

## Notification roles

Anyone in Dank Memer Community can use `/roles` to open a private menu with three groups: Dank Memer Roles, Bot Event Roles, and Server Roles. Existing roles are preselected. Select roles to enable their pings, deselect them to disable pings, or clear a dropdown to disable all roles shown in that group. Each dropdown saves automatically and only changes that group.

New DMC members who pass the existing join checks automatically receive the Dank Memer news/update notification role (`1283084915579027468`). They can turn it off through `/roles` afterward.

The Components V2 menu is built with [DisUI](https://github.com/badosz0/DisUI), including its headings, containers, and dropdowns. DisUI resolves the interface into the API components sent by discord.js.

Role names are read from Discord. The bot needs **Manage Roles**, and its highest role must be above every notification role. Missing, managed, or higher roles are omitted with an availability notice.

Changes are queued per server, with pending selections for the same member and group combined into the latest selection. The queue refreshes membership before applying changes, skips roles already in the requested state, and changes one role at a time so unrelated roles are preserved. Discord's client handles rate-limit waits and retries. Dropdowns are disabled while saving; failures show a retry message and do not stop subsequent queued changes.

Run `npm run test:roles` to compile and run the notification-role tests without connecting the bot to Discord or syncing commands.
