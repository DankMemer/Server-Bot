
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { CONFIG } from '../../config';
import { Colors } from '../../constants/colors';
import { Command, CommandContext } from '../../structures/command';
import { ephemeralResponse } from '../../utils/format';
import { canAssignRole, isStaff } from '../../utils/moderation';
import { parseUsers } from '../../utils/user-parsing';

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
    )
    .addSubcommand(option =>
      option
        .setName('addmulti')
        .setDescription('Add a role to multiple users')
        .addRoleOption(subOption =>
          subOption
            .setName('role')
            .setDescription('Role to add')
            .setRequired(true),
        )
        .addStringOption(subOption =>
          subOption
            .setName('users')
            .setDescription('Users (space/comma/semicolon separated): user1, user2; 123456789')
            .setRequired(true),
        ),
    );

  public override servers = [CONFIG.ids.servers.dmc, CONFIG.ids.servers.dmo];

  public override execute = async ({ interaction }: CommandContext): Promise<void> => {
    const action = interaction.options.getSubcommand();
    const role = interaction.guild.roles.cache.get(
      interaction.options.getRole('role', true).id,
    );

    switch (action) {
      case 'info': {
        const authorMember = interaction.guild.members.resolve(
          interaction.user.id,
        );

        if (!authorMember || !isStaff(authorMember)) {
          await interaction.reply(ephemeralResponse('You do not have permission to use this command.'));
          return;
        }

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
          await interaction.reply(ephemeralResponse('@everyone is not a valid role'));
          return;
        }

        if (!canAssignRole(authorMember, role)) {
          await interaction.reply(ephemeralResponse('You do not have permission to assign this role.'));
          return;
        }

        try {
          await member.roles.add(role.id);
          await interaction.reply({
            content: `Added <@&${role.id}> to ${member}.`,
          });
        } catch {
          await interaction.reply(ephemeralResponse(`Could not add <@&${role.id}> to ${member}.`));
        }
        return;
      }

      case 'remove': {
        const member = interaction.guild.members.resolve(
          interaction.options.getUser('user', true).id,
        );
        const authorMember = interaction.guild.members.resolve(
          interaction.user.id,
        );

        if (role.guild.id === role.id) {
          await interaction.reply({
            content: '@everyone is not a valid role',
          });
          return;
        }

        if (!canAssignRole(authorMember, role)) {
          await interaction.reply({
            content: 'You do not have permission to remove this role.',
          });
          return;
        }

        try {
          await member.roles.remove(role.id);
          await interaction.reply({
            content: `Removed <@&${role.id}> from ${member}.`,
          });
        } catch {
          await interaction.reply({
            content: `Could not remove <@&${role.id}> from ${member}.`,
          });
        }
        return;
      }

      case 'addmulti': {
        const authorMember = interaction.guild.members.resolve(
          interaction.user.id,
        );

        if (!authorMember || !isStaff(authorMember)) {
          await interaction.reply({
            content: 'You do not have permission to use this command.',
          });
          return;
        }

        if (role.guild.id === role.id) {
          await interaction.reply({
            content: '@everyone is not a valid role',
          });
          return;
        }

        if (!canAssignRole(authorMember, role)) {
          await interaction.reply({
            content: 'You do not have permission to assign this role.',
          });
          return;
        }

        const usersInput = interaction.options.getString('users', true);

        await interaction.deferReply({ ephemeral: false });

        try {
          const members = await parseUsers(usersInput, interaction.guild);

          const userList = members
            .map(member => `• ${member.user.username} (${member.user.id})`)
            .join('\n');

          const description = `**Role to assign:** <@&${role.id}>\n\n**Users (${members.length}):**\n${userList}\n\n**Are you sure?**`;

          const userIds = members.map(m => m.id).join(',');

          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setTitle('Confirm Multi-Role Assignment')
                .setDescription(description)
                .setColor(Colors.ORANGE),
            ],
            components: [
              new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                  new ButtonBuilder()
                    .setLabel(`Assign Role to ${members.length} Users`)
                    .setCustomId(`role-addmulti-confirm:${interaction.user.id}:${role.id}:${userIds}`)
                    .setStyle(ButtonStyle.Primary),
                ),
            ],
          });
        } catch (error) {
          await interaction.editReply({
            content: error?.message ?? 'An unexpected error occurred while parsing users.',
          });
        }
      }
    }
  }
};

