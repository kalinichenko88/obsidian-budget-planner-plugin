import { Plugin } from 'obsidian';

import { DEFAULT_SETTINGS, SettingTab, type Settings } from './settings';
import { tableExtension } from './codeblocks';
import { registerCommands } from './commands';

class BudgetPlannerPlugin extends Plugin {
  public settings: Settings;
  // Removed unused UiStateStore

  private async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  public async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  public async onload(): Promise<void> {
    await this.loadSettings();

    this.registerEditorExtension(tableExtension);

    registerCommands(this);

    this.addSettingTab(new SettingTab(this.app, this));
  }
}

export default BudgetPlannerPlugin;
