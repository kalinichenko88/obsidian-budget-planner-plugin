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

	private createTableCell(row: HTMLTableRowElement, value: string, className = ''): HTMLTableCellElement {
		const cell = row.createEl('td');
		cell.className = className;
		const wrapper = cell.createEl('div', { attr: { class: 'budget-table-cell' } });
		wrapper.innerHTML = value;

		return cell;
	}

	private createTableHeader(table: HTMLTableElement, text: string): void {
		const categoryRow = table.createEl('tr');
		const cell = categoryRow.createEl('td', { attr: { colspan: 3 } });
		cell.innerHTML = `<strong class="budget-table-cell budget-table-title">${text}</strong>`;
	}

	private createTableCategorySummary(table: HTMLTableElement, sum: number): void {
		const summaryRow = table.createEl('tr', { attr: { class: 'budget-category-summary' } });
		summaryRow.createEl('td');

		this.createTableCell(summaryRow, this.moneyFormatter.format(sum), 'text-right budget-amount');
		this.createTableCell(summaryRow, '');
	}

	private createTableSummary(table: HTMLTableElement, sum: number): void {
		const summaryRow = table.createEl('tr', { attr: { class: 'budget-summary' } });
		summaryRow.createEl('td');

		this.createTableCell(summaryRow, this.moneyFormatter.format(sum), 'text-right budget-amount');
		this.createTableCell(summaryRow, '');
	}

	public render() {
		const data = this.parser.parseCode();
		const categories = Array.from(data.keys());

		const wrapper = this.createWrapper();
		const table = this.el.createEl('table', { attr: { class: 'budget-table' } });

		categories.forEach((category) => {
			this.createTableHeader(table, category);

			const dataValue = data.get(category) || { rows: [], meta: { sum: 0 } };
			dataValue.rows.forEach((row) => {
				const rowEl = table.createEl('tr');
				this.createTableCell(rowEl, row.name, 'budget-name');
				this.createTableCell(rowEl, this.moneyFormatter.format(row.amount), 'text-right budget-amount');
				this.createTableCell(rowEl, row.comment, 'budget-comment');
			});

			if (dataValue.meta.sum > 0) {
				this.createTableCategorySummary(table, dataValue.meta.sum);
			}
		});

		const sum = Array.from(data.values()).reduce((acc, value) => acc + value.meta.sum, 0);
		if (sum > 0) {
			this.createTableSummary(table, sum);
		}

		wrapper.appendChild(table);
		this.el.appendChild(wrapper);
	}
}
