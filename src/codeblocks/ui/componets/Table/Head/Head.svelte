<script lang="ts">
  import { Menu } from 'obsidian';
  import { getContext } from 'svelte';

  import type { StoreActions } from '../actions';
  import { SortColumn, SortOrder } from '../models';
  import { STORE_ACTIONS_CONTEXT_KEY } from '../constants';

  const { selectRow, sortRows } = getContext<StoreActions>(STORE_ACTIONS_CONTEXT_KEY);

  let selectedColumn: SortColumn;

  const menu = new Menu()
    .addItem((item) => {
      item
        .setTitle('Sort by this column (ASC)')
        .setIcon('arrow-up-narrow-wide')
        .onClick(() => {
          if (selectedColumn) {
            sortRows(SortOrder.ASC, selectedColumn);
          }
        });
    })
    .addItem((item) => {
      item
        .setTitle('Sort by this column (DESC)')
        .setIcon('arrow-down-narrow-wide')
        .onClick(() => {
          if (selectedColumn) {
            sortRows(SortOrder.DESC, selectedColumn);
          }
        });
    });

  const handleOnContextMenu = (event: MouseEvent, column: SortColumn): void => {
    event.preventDefault();
    selectedColumn = column;
    menu.showAtMouseEvent(event);
    selectRow(null);
  };
</script>

<thead class="head">
  <tr>
    <th
      class="check"
      oncontextmenu={(event) => handleOnContextMenu.apply(undefined, [event, SortColumn.CHECK])}
      >#</th
    >
    <th
      class="name"
      oncontextmenu={(event) => handleOnContextMenu.apply(undefined, [event, SortColumn.NAME])}
      >Name</th
    >
    <th
      class="amount"
      oncontextmenu={(event) => handleOnContextMenu.apply(undefined, [event, SortColumn.AMOUNT])}
      >Amount</th
    >
    <th class="comment">Comment</th>
  </tr>
</thead>

<style>
  .head {
    background: var(--table-header-background);
    color: var(--table-header-color);
    font: var(--table-header-font);
    font-size: var(--table-header-size);
    font-weight: var(--table-header-weight);
    border-width: var(--table-header-border-width);
    border-color: var(--table-header-border-color);

    th {
      padding: var(--size-2-2) var(--size-4-2);
    }
  }
  .check {
    width: 5%;
  }

  .name {
    width: 35%;
  }

  .amount {
    width: 20%;
  }

  .comment {
    width: auto;
  }
</style>
