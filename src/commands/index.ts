import { resolve } from 'node:path';
import { sync } from 'globby';
import { Command } from '../structures/command';
import { Paginator } from '../structures/paginator';
import { Component } from '../structures/component';
import { Modal } from '../structures/modal';

export const Commands = new Map<string, Command>();
export const Paginators = new Map<string, Paginator>();
export const Components = new Map<string, Component>();
export const Modals = new Map<string, Modal>();

const filenames = sync(resolve(__dirname, '**/*.js'));

for (const filename of filenames) {
  if (filename === __filename) {
    continue;
  }

  const file = require(filename);

  for (const exported of Object.values(file) as any[]) {
    if (exported.prototype instanceof Command) {
      const instance = new exported();
      Commands.set(instance.data.name, instance);
    } else if (exported.prototype instanceof Paginator) {
      const instance = new exported();
      Paginators.set(instance.id, instance);
    } else if (exported.prototype instanceof Component) {
      const instance = new exported();
      Components.set(instance.id, instance);
    } else if (exported.prototype instanceof Modal) {
      const instance = new exported();
      Modals.set(instance.id, instance);
    }
  }
}
