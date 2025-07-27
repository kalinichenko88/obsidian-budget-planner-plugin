import { type App, PluginSettingTab, Setting } from 'obsidian';

import type BudgetPlannerPlugin from '@/Plugin';

export class SettingTab extends PluginSettingTab {
  plugin: BudgetPlannerPlugin;

  constructor(app: App, plugin: BudgetPlannerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  public display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl).setName('Default value for budget block').addTextArea((text) =>
      text
        .setPlaceholder('Enter your secret')
        .setValue(this.plugin.settings.defaultBudgetBlock)
        .onChange(async (value) => {
          this.plugin.settings.defaultBudgetBlock = value;
          await this.plugin.saveSettings();
        })
    );
  }
}
