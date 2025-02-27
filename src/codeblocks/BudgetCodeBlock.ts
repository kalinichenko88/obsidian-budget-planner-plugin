import { type MarkdownPostProcessorContext } from 'obsidian';
import { mount, unmount } from 'svelte';

import type { TableCategories, TableRows } from './models';
import Table from './ui/componets/Table/Table.svelte';
import { BudgetCodeParser } from './BudgetCodeParser';

export class BudgetCodeBlock {
	private readonly source: string;
	private readonly parser: BudgetCodeParser;
	private readonly categories: TableCategories;
	private readonly rows: TableRows;

	constructor(
		source: string,
		private readonly el: HTMLElement,
		private readonly ctx: MarkdownPostProcessorContext,
	) {
		this.source = source || '';
		this.parser = new BudgetCodeParser(this.source);

		const { categories, rows } = this.parser.parse();
		this.categories = categories;
		this.rows = rows;

		// this.ctx.addChild({
		// 	unload: () => {
		// 		this.destroy();
		// 	},
		// });
	}

	public render(): void {
		const onChange = (newData: any) => {
			console.log('onChange called', newData);
		};

		mount(Table, {
			target: this.el,
			props: {
				categories: this.categories,
				rows: this.rows,
				onChange,
			},
		});
	}

	public async destroy(): Promise<void> {
		await unmount(this.el);
	}
}
