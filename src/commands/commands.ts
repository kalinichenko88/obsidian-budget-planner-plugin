import { Editor, Plugin } from 'obsidian';

import type { Settings } from '../settings';
import { CodeFormatCommand } from './CodeFormatCommand';

type BudgetPlugin = Plugin & { settings: Settings };

export const registerCommands = (plugin: BudgetPlugin) => {
  plugin.addCommand({
    id: 'insert-budget-planner',
    name: 'Insert Budget Planner',
    editorCallback: (editor: Editor) => {
      editor.replaceSelection('```budget\n' + plugin.settings.defaultBudgetBlock + '\n```');
    },
  });

  plugin.addCommand({
    id: 'format-budget-planner',
    name: 'Format Code Blocks',
    editorCallback: (editor: Editor) => {
      new CodeFormatCommand().handle(editor);
    },
  });
};
