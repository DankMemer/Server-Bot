
import { SlashCommandBuilder } from 'discord.js';
import { evaluate } from 'mathjs';
import { CONFIG } from '../config';
import { Command, CommandContext } from '../structures/command';
import { codeblock } from '../utils/codeblock';

export class CalcCommand extends Command {
  public override data = new SlashCommandBuilder()
    .setName('calc')
    .setDescription('Calculate an equation')
    .addStringOption(option =>
      option
        .setName('equation')
        .setDescription('Equation to calculate')
        .setRequired(true),
    );
  public override servers = [ CONFIG.ids.servers.dmc ];
  public override execute = ({ interaction }: CommandContext): string => {
    const equation = interaction.options.getString('equation', true);

    let result: string;

    try {
      result = evaluate(equation);
    } catch {
      result = 'Invalid Equation';
    }

    return (
      ':inbox_tray: **Input:**\n' +
      `${codeblock(equation)}\n` +
      ':outbox_tray: **Output:**\n' +
      `${codeblock(result)}`
    );
  };
}
