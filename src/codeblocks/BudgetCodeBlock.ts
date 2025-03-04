import { MarkdownRenderChild, debounce } from 'obsidian';
import { mount, unmount } from 'svelte';
import { writable } from 'svelte/store';

import type {
  TableCategories,
  TableRows,
  TableStore,
  TableStateStore,
  TableStoreValue,
} from './models';
import { BudgetCodeParser } from './BudgetCodeParser';

import Table from './ui/componets/Table/Table.svelte';

export class BudgetCodeBlock extends MarkdownRenderChild {
  private readonly source: string;
  private readonly parser: BudgetCodeParser;
  private readonly categories: TableCategories;
  private readonly rows: TableRows;
  private component: Record<string, unknown>;

  constructor(
    private readonly el: HTMLElement,
    private readonly markdownSource: string
  ) {
    super(el);

    const source = this.markdownSource || '';
    const parser = new BudgetCodeParser(source);
    const { categories, rows } = parser.parse();

    this.categories = categories;
    this.rows = rows;
  }

  private createTableStore(): [TableStore, TableStateStore] {
    const tableStore: TableStore = writable({
      rows: this.rows,
      categories: this.categories,
    });
    const tableStateStore: TableStateStore = writable({
      selectedRowId: null,
      editingRowId: null,
      editingCell: null,
    });

    return [tableStore, tableStateStore];
  }

  private onTableChange(newData: TableStoreValue): void {
    console.log('onTableChange called', newData);
  }

  public onload(): void {
    const onChange = debounce(this.onTableChange, 500, true);
    const [tableStore, tableStateStore] = this.createTableStore();

    this.component = mount(Table, {
      target: this.el,
      props: {
        tableStore,
        tableStateStore,
        onChange,
      },
    });
  }

  public async onunload(): Promise<void> {
    await unmount(this.component);
    super.unload();
  }
}
