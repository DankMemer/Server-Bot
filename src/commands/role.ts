
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { CONFIG } from '../config';
import { Colors } from '../constants/colors';
import { Command, CommandContext } from '../structures/command';

export class RoleCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('role')
    .setDescription('Role manipulation')
    .addSubcommand(option =>
      option
        .setName('info')
        .setDescription('Information about a role')
        .addRoleOption(subOption =>
          subOption
            .setName('role')
            .setDescription('The role you would like to check')
            .setRequired(true),
        ),
    )
    .addSubcommand(option =>
      option
        .setName('add')
        .setDescription('Add a role to the user')
        .addUserOption(subOption =>
          subOption
            .setName('user')
            .setDescription('Member you would like to add a role to')
            .setRequired(true),
        )
        .addRoleOption(subOption =>
          subOption
            .setName('role')
            .setDescription('Role to add')
            .setRequired(true),
        ),
    )
    .addSubcommand(option =>
      option
        .setName('remove')
        .setDescription('Remove a role from the user')
        .addUserOption(subOption =>
          subOption
            .setName('user')
            .setDescription('Member you would like to remove a role from')
            .setRequired(true),
        )
        .addRoleOption(subOption =>
          subOption
            .setName('role')
            .setDescription('Role to remove')
            .setRequired(true),
        ),
    );
  public override servers = [ CONFIG.ids.servers.dmc, CONFIG.ids.servers.dmo ];
  public override execute = async ({ interaction }: CommandContext): Promise<EmbedBuilder | string> => {
    const action = interaction.options.getSubcommand();
    const role = interaction.guild.roles.cache.get(
      interaction.options.getRole('role', true).id,
    );

    switch (action) {
      case 'info': {
        await interaction.deferReply();

        return void await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setAuthor({ name: 'Role Info' })
              .setThumbnail(role.iconURL())
              .addFields(
                {
                  name: 'Name',
                  value: role.name,
                  inline: true,
                },
                {
                  name: 'Members',
                  value: role.members.size.toLocaleString(),
                  inline: true,
                },
                {
                  name: 'ID',
                  value: role.id,
                  inline: true,
                },
                {
                  name: 'Color',
                  value: role.hexColor.toUpperCase(),
                  inline: true,
                },
                {
                  name: 'Position',
                  value: role.rawPosition.toString(),
                  inline: true,
                },
                {
                  name: 'Created',
                  value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, // TODO: util this bc I HATE it
                  inline: true,
                },
              )
              .setColor(role.color || Colors.INVISIBLE),
          ],
        });
      }

      case 'add': {
        const member = interaction.guild.members.resolve(
          interaction.options.getUser('user', true).id,
        );
        const authorMember = interaction.guild.members.resolve(
          interaction.user.id,
        );

        if (role.guild.id === role.id) {
          return '@everyone is not a valid role';
        }

        if (role.rawPosition >= authorMember.roles.highest.rawPosition) {
          return 'You cannot add this role to anyone.';
        }

        try {
          await member.roles.add(role.id);
          return `Added <@&${role.id}> to ${member}.`;
        } catch {
          return `Could not add <@&${role.id}> to ${member}.`;
        }
      }

      case 'remove': {
        const member = interaction.guild.members.resolve(
          interaction.options.getUser('user', true).id,
        );
        const authorMember = interaction.guild.members.resolve(
          interaction.user.id,
        );

        if (role.guild.id === role.id) {
          return '@everyone is not a valid role';
        }

        if (role.rawPosition >= authorMember.roles.highest.rawPosition) {
          return 'You cannot remove this role from anyone.';
        }

        try {
          await member.roles.remove(role.id);
          return `Removed <@&${role.id}> from ${member}.`;
        } catch {
          return `Could not remove <@&${role.id}> from ${member}.`;
        }
      }
    }
  };
}

