export interface PluginSettings {
	defaultBudgetBlock: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	defaultBudgetBlock:
		'Category 1:\n' +
		'\tRent       | 1000 | Comment\n' +
		'\tCommunal Fees | 100\n' +
		'Category 2:\n' +
		'\tFood    | 500',
};
