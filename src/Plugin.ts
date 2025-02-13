import { Plugin } from 'obsidian';

import { DEFAULT_SETTINGS, SettingTab, type Settings } from './settings';
import { registerCodeBlocks } from './codeblocks';
import { registerCommands } from './commands';

class BudgetPlannerPlugin extends Plugin {
	settings: Settings;

	private async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	public async saveSettings() {
		await this.saveData(this.settings);
	}

	public async onload() {
		await this.loadSettings();

		registerCommands(this);
		registerCodeBlocks(this);

		this.addSettingTab(new SettingTab(this.app, this));
	}
}

export default BudgetPlannerPlugin;
