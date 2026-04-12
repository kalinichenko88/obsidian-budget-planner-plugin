import type { Editor } from 'obsidian';

import type BudgetPlannerPlugin from '@/Plugin';

export const registerCommands = (plugin: BudgetPlannerPlugin): void => {
  plugin.addCommand({
    id: 'insert',
    name: 'Insert budget block',
    editorCallback: (editor: Editor) => {
      editor.replaceSelection('```budget\n' + plugin.settings.defaultBudgetBlock + '\n```\n');
    },
  });
};
