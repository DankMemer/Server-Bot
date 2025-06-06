import { User } from '@prisma/client';
import { EmbedBuilder, MessageComponentInteraction } from 'discord.js';
import { Promisable } from 'type-fest';

export type ComponentContext = {
  interaction: MessageComponentInteraction;
  userEntry: User;
};

export abstract class Component {
  public abstract id: string;

  public abstract execute(context: ComponentContext): Promisable<string | void | EmbedBuilder>;
}
