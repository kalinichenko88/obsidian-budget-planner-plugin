import type { Editor } from 'obsidian';

import type BudgetPlannerPlugin from '@/Plugin';

export const registerCommands = (plugin: BudgetPlannerPlugin): void => {
  plugin.addCommand({
    id: 'insert-budget-planner',
    name: 'Insert Budget Planner',
    editorCallback: (editor: Editor) => {
      editor.replaceSelection('```budget\n' + plugin.settings.defaultBudgetBlock + '\n```');
    },
  });
};
