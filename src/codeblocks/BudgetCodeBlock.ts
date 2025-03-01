import { MarkdownRenderChild } from 'obsidian';
import { mount, unmount } from 'svelte';
import { writable } from 'svelte/store';

import type { TableCategories, TableRows, TableStore } from './models';
import { BudgetCodeParser } from './BudgetCodeParser';

import Table from './ui/componets/Table/Table.svelte';

export class BudgetCodeBlock extends MarkdownRenderChild {
  private readonly source: string;
  private readonly parser: BudgetCodeParser;
  private readonly categories: TableCategories;
  private readonly rows: TableRows;
  private component: any;

  constructor(
    private readonly el: HTMLElement,
    private readonly markdownSource: string,
  ) {
    super(el);

    const source = this.markdownSource || '';
    const parser = new BudgetCodeParser(source);
    const { categories, rows } = parser.parse();

    this.categories = categories;
    this.rows = rows;
  }

  private createTableStore(): TableStore {
    return writable({
      selectedRowId: '',
      rows: this.rows,
      categories: this.categories,
    });
  }

  public onload(): void {
    const onChange = (newData: any) => {
      console.log('onChange called', newData);
    };

    this.component = mount(Table, {
      target: this.el,
      props: {
        store: this.createTableStore(),
        onChange,
      },
    });
  }

  public async onunload(): Promise<void> {
    super.unload();
    await unmount(this.component);
  }
}
