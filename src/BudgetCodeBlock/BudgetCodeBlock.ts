import type { MarkdownPostProcessorContext } from 'obsidian';

import { CodeParser } from './CodeParser';

export class BudgetCodeBlock {
	private readonly source: string;
	private readonly parser: CodeParser;
	private readonly moneyFormatter: Intl.NumberFormat;

	constructor(
		source: string,
		private readonly el: HTMLElement,
		private readonly ctx: MarkdownPostProcessorContext,
	) {
		this.source = source || '';
		this.parser = new CodeParser(this.source);
		this.moneyFormatter = new Intl.NumberFormat('en-US', {
			style: 'decimal',
		});
	}

	private createWrapper(): HTMLDivElement {
		const wrapper = this.el.createEl('div');
		wrapper.className = 'budget-wrapper';

		return wrapper;
	}

	public render() {
		const data = this.parser.parseCode();
		const categories = Array.from(data.keys());

		const wrapper = this.createWrapper();
		const table = this.el.createEl('table', { attr: { class: 'budget-table' } });

		categories.forEach((category) => {
			const categoryRow = table.createEl('tr');
			categoryRow.createEl('td', { text: category, attr: { colspan: 3 } });

			const rows = data.get(category) || [];
			rows.forEach((row) => {
				const rowEl = table.createEl('tr');
				rowEl.createEl('td', { text: row.name });
				rowEl.createEl('td', { text: this.moneyFormatter.format(row.amount), attr: { class: 'text-right' } });
				rowEl.createEl('td', { text: row.comment });
			});
		});

		wrapper.appendChild(table);
		this.el.appendChild(wrapper);
	}
}
