import { Paginators } from '..';
import { Component, ComponentContext } from '../../structures/component';

export class PaginationComponent extends Component {
  public override id = 'pg';

  public override async execute({ interaction }: ComponentContext): Promise<void> {
    const paginator = Paginators.get(interaction.customId.split(':')[2]);

    if (paginator) {
      return await paginator.onInteraction(interaction);
    }

    interaction.deferUpdate();
  }
}
