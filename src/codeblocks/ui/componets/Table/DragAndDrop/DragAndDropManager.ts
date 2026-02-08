import Sortable, { type SortableEvent } from 'sortablejs';

import type { CategoryId, RowId } from '../../../../models';
import type { StoreActions } from '../actions';
import { generateId } from '../../../../helpers/generateId';

export class DragAndDropManager {
  private tableEl: HTMLTableElement;
  private actions: StoreActions;
  private categorySortable: Sortable | null = null;
  private rowSortables: Sortable[] = [];
  private dragOriginalParent: HTMLElement | null = null;
  private dragOriginalNextSibling: Node | null = null;
  private readonly rowGroupName: string;

  constructor(tableEl: HTMLTableElement, actions: StoreActions) {
    this.tableEl = tableEl;
    this.actions = actions;
    this.rowGroupName = `rows-${generateId()}`;
  }

  init(): void {
    this.initCategorySortable();
    this.initRowSortables();
  }

  refresh(): void {
    this.destroyRowSortables();
    this.initRowSortables();
  }

  setDisabled(disabled: boolean): void {
    if (this.categorySortable) {
      this.categorySortable.option('disabled', disabled);
    }

    for (const sortable of this.rowSortables) {
      sortable.option('disabled', disabled);
    }
  }

  destroy(): void {
    if (this.categorySortable) {
      this.categorySortable.destroy();
      this.categorySortable = null;
    }

    this.destroyRowSortables();
  }

  private saveDragOrigin(event: SortableEvent): void {
    this.dragOriginalParent = event.from as HTMLElement;
    this.dragOriginalNextSibling = event.item.nextSibling;
  }

  private revertDom(item: HTMLElement): void {
    if (this.dragOriginalParent) {
      this.dragOriginalParent.insertBefore(item, this.dragOriginalNextSibling);
    }
    this.dragOriginalParent = null;
    this.dragOriginalNextSibling = null;
  }

  private initCategorySortable(): void {
    this.categorySortable = Sortable.create(this.tableEl, {
      handle: '.category-drag-handle',
      draggable: 'tbody.category-group',
      animation: 150,
      ghostClass: 'sortable-ghost-category',
      chosenClass: 'sortable-chosen-category',
      onStart: (event: SortableEvent) => {
        this.saveDragOrigin(event);
      },
      onEnd: (event: SortableEvent) => {
        const { item, oldDraggableIndex, newDraggableIndex } = event;

        if (
          oldDraggableIndex === undefined ||
          newDraggableIndex === undefined ||
          oldDraggableIndex === newDraggableIndex
        ) {
          return;
        }

        const categoryId = item.dataset.categoryId as CategoryId;
        if (!categoryId) return;

        this.revertDom(item);
        this.actions.moveCategory(categoryId, newDraggableIndex);
      },
    });
  }

  private initRowSortables(): void {
    const tbodies = Array.from(
      this.tableEl.querySelectorAll<HTMLTableSectionElement>('tbody.category-group')
    );

    for (const tbody of tbodies) {
      const sortable = Sortable.create(tbody, {
        handle: '.row-drag-handle',
        draggable: 'tr.row',
        group: this.rowGroupName,
        animation: 150,
        ghostClass: 'sortable-ghost-row',
        chosenClass: 'sortable-chosen-row',
        onStart: (event: SortableEvent) => {
          this.saveDragOrigin(event);
        },
        onEnd: (event: SortableEvent) => {
          const { item, from, to, oldDraggableIndex, newDraggableIndex } = event;

          if (oldDraggableIndex === undefined || newDraggableIndex === undefined) return;

          const rowId = item.dataset.rowId as RowId;
          if (!rowId) return;

          const fromCategoryId = (from as HTMLElement).dataset.categoryId as CategoryId;
          const toCategoryId = (to as HTMLElement).dataset.categoryId as CategoryId;

          if (!fromCategoryId || !toCategoryId) return;
          if (fromCategoryId === toCategoryId && oldDraggableIndex === newDraggableIndex) return;

          this.revertDom(item);
          this.actions.moveRow(rowId, fromCategoryId, toCategoryId, newDraggableIndex);
        },
      });

      this.rowSortables.push(sortable);
    }
  }

  private destroyRowSortables(): void {
    for (const sortable of this.rowSortables) {
      sortable.destroy();
    }
    this.rowSortables = [];
  }
}
