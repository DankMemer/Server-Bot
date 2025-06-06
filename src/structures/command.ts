import { User } from '@prisma/client';
import { AutocompleteInteraction, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from 'discord.js';
import { Promisable } from 'type-fest';

export type CommandContext = {
  interaction: ChatInputCommandInteraction;
  userEntry: User;
};

export type AutocompleteContext = {
  interaction: AutocompleteInteraction;
  userEntry: User;
  value: string;
};

export type AutocompleteReturnable = Array<{
  name: string; value: string;
}>; // TODO: discord.js probably has a type for it

export abstract class Command {
  public data: SlashCommandBuilder | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'> | SlashCommandSubcommandsOnlyBuilder; // TODO: this is getting weird;
  public servers: string[];

  // TODO: i hate this
  public autocomplete?: (context: AutocompleteContext) => Promisable<AutocompleteReturnable>;

  public abstract execute(context: CommandContext): Promisable<string | void | EmbedBuilder>;
}
