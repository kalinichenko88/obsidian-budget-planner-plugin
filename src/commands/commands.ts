import type { Editor, Plugin } from 'obsidian';

import type { Settings } from '../settings';

type BudgetPlugin = Plugin & { settings: Settings };

export const registerCommands = (plugin: BudgetPlugin): void => {
  plugin.addCommand({
    id: 'insert-budget-planner',
    name: 'Insert Budget Planner',
    editorCallback: (editor: Editor) => {
      editor.replaceSelection('```budget\n' + plugin.settings.defaultBudgetBlock + '\n```');
    },
  });
};
