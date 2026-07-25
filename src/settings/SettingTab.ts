import { type App, PluginSettingTab, Setting, type SettingDefinitionItem } from 'obsidian';

import type BudgetPlannerPlugin from '@/Plugin';

const NAME = 'Default value for budget block';
const PLACEHOLDER = 'Category:\n\t[ ] | item | 0 | comment';

export class SettingTab extends PluginSettingTab {
  plugin: BudgetPlannerPlugin;

  constructor(app: App, plugin: BudgetPlannerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  public getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        name: NAME,
        control: {
          type: 'textarea',
          key: 'defaultBudgetBlock',
          placeholder: PLACEHOLDER,
        },
      },
    ];
  }

  /** Fallback for Obsidian < 1.13.0, which has no declarative settings API. */
  public display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl).setName(NAME).addTextArea((text) =>
      text
        .setPlaceholder(PLACEHOLDER)
        .setValue(this.plugin.settings.defaultBudgetBlock)
        .onChange(async (value) => {
          this.plugin.settings.defaultBudgetBlock = value;
          await this.plugin.saveSettings();
        })
    );
  }
}
