import { Editor, Plugin } from 'obsidian';

import { CodeFormatCommand } from './CodeFormatCommand';

type Asd = Plugin & { settings: { defaultBudgetBlock: string } };

export const registerCommands = (plugin: Asd) => {
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
