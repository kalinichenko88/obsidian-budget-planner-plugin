import { type MarkdownPostProcessorContext, Plugin } from 'obsidian';

import { BudgetCodeBlock } from './BudgetCodeBlock';

export const registerCodeBlocks = (plugin: Plugin) => {
	plugin.registerMarkdownCodeBlockProcessor(
		'budget',
		(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
			const codeBlock = new BudgetCodeBlock(source, el, ctx);
			codeBlock.render();

			// ctx.addChild(() => {
			// 	codeBlock.destroy();
			// });
		},
	);
};
