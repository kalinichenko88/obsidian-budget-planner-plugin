import { MarkdownRenderChild, type App, type MarkdownPostProcessorContext } from 'obsidian';
import { mount, unmount } from 'svelte';
import { writable } from 'svelte/store';

import { logInfo, logError, logWarning } from '@/shared/helpers/log';

import type {
  TableCategories,
  TableRows,
  TableStore,
  TableStateStore,
  TableStoreValues,
  TableStateValues,
} from './models';
import { BudgetCodeParser } from './BudgetCodeParser';
import { BudgetCodeWriter } from './BudgetCodeWriter';

import Table from './ui/componets/Table/Table.svelte';

export class BudgetCodeBlock extends MarkdownRenderChild {
  private readonly categories: TableCategories;
  private readonly rows: TableRows;
  private component: Record<string, unknown>;
  private readonly budgetCodeWriter: BudgetCodeWriter;

  constructor(
    markdownSource: string,
    private readonly el: HTMLElement,
    private readonly app: App,
    private readonly context: MarkdownPostProcessorContext
  ) {
    super(el);

    const source = markdownSource || '';
    const parser = new BudgetCodeParser(source);
    const { categories, rows } = parser.parse();

    this.categories = categories;
    this.rows = rows;
    this.budgetCodeWriter = new BudgetCodeWriter(this.app);
  }

  private createTableStore(): [TableStore, TableStateStore] {
    const tableStore = writable<TableStoreValues>({
      rows: this.rows,
      categories: this.categories,
    });
    const tableStateStore = writable<TableStateValues>({
      selectedRowId: null,
      isEditing: false,
    });

    return [tableStore, tableStateStore];
  }

  private async saveTable(newData: TableStoreValues): Promise<void> {
    const sectionInfo = this.context.getSectionInfo(this.el);
    if (!sectionInfo) {
      logWarning('Section info not found');
      return;
    }

    const cmScroller = document.querySelector('.cm-scroller');
    const scrollPosition = cmScroller
      ? { top: cmScroller.scrollTop, left: cmScroller.scrollLeft }
      : { top: 0, left: 0 };

    try {
      logInfo('The table data is being saved');
      await this.budgetCodeWriter.write(newData, sectionInfo);

      if (cmScroller) {
        cmScroller.scrollTop = scrollPosition.top;
        cmScroller.scrollLeft = scrollPosition.left;
      }
    } catch (error) {
      logError('Error saving table.', error);
    }
  }

  public onload(): void {
    const [tableStore, tableStateStore] = this.createTableStore();

    this.component = mount(Table, {
      target: this.el,
      props: {
        tableStore,
        tableStateStore,
        onSave: this.saveTable.bind(this),
      },
    });
  }

  public async onunload(): Promise<void> {
    await unmount(this.component);
    // Call the base class cleanup without triggering a recursion
    super.onunload();
  }
}
