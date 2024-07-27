import { Editor, MarkdownView, Plugin } from 'obsidian';

import { PluginSettings, DEFAULT_SETTINGS } from './settings';
import { BudgetCodeBlock } from './BudgetCodeBlock';
import { SettingTab } from './SettingTab';

class BudgetPlannerPlugin extends Plugin {
	settings: PluginSettings;

	private async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	public async saveSettings() {
		await this.saveData(this.settings);
	}

	public async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'insert-budget-planner',
			name: 'Insert Budget Planner',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				editor.replaceSelection('```budget\n' + this.settings.defaultBudgetBlock + '\n```');
			},
		});

		this.registerMarkdownCodeBlockProcessor('budget', (source, el, ctx) => {
			const codeBlock = new BudgetCodeBlock(source, el, ctx);
			codeBlock.render();
		});

		this.addSettingTab(new SettingTab(this.app, this));
	}
}

export default BudgetPlannerPlugin;
