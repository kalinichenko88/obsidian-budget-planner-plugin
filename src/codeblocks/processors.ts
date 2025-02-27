import { type MarkdownPostProcessorContext, Plugin } from 'obsidian';

import { BudgetCodeBlock } from './BudgetCodeBlock';

export const registerCodeBlocks = (plugin: Plugin) => {
	plugin.registerMarkdownCodeBlockProcessor(
		'budget',
		(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
			ctx.addChild(new BudgetCodeBlock(el, source));
		},
	);
};
