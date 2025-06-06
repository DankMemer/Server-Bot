import { User } from '@prisma/client';
import { EmbedBuilder, ModalSubmitInteraction } from 'discord.js';
import { Promisable } from 'type-fest';

export type ModalContext = {
  interaction: ModalSubmitInteraction;
  userEntry: User;
};

export abstract class Modal {
  public abstract id: string;

  public abstract execute(context: ModalContext): Promisable<string | void | EmbedBuilder>;
}
