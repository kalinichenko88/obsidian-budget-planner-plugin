import type { MarkdownPostProcessorContext } from 'obsidian';

export class BudgetCodeBlock {
	private readonly source: string;

	constructor(
		source: string,
		private readonly el: HTMLElement,
		private readonly ctx: MarkdownPostProcessorContext,
	) {
		this.source = source || '';
	}

	public render() {
		const wrapper = this.el.createEl('div');
		wrapper.className = 'budget-wrapper';
	}
}
