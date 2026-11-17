import { User } from '@prisma/client';
import { AutocompleteInteraction, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandsOnlyBuilder } from 'discord.js';
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
  public data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
  public servers: string[];

  // TODO: i hate this
  public autocomplete?: (context: AutocompleteContext) => Promisable<AutocompleteReturnable>;

  public abstract execute(context: CommandContext): Promisable<string | void | EmbedBuilder>;
}
