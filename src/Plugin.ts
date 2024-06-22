import { Plugin } from 'obsidian';

import { PluginSettings, DEFAULT_SETTINGS } from './settings';
import { BudgetCodeBlock } from './BudgetCodeBlock';

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

		this.registerMarkdownCodeBlockProcessor('budget', (source, el, ctx) => {
			const codeBlock = new BudgetCodeBlock(source, el, ctx);
			codeBlock.render();
		});
	}

	onunload() {
		console.log('unloading Budget Planner Plugin');
	}
}

export default BudgetPlannerPlugin;
