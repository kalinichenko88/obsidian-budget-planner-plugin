<script lang="ts">
  import { getContext } from 'svelte';
  import { Menu } from 'obsidian';

  import type { TableRow, TableStateStore } from '../../../../models';
  import type { StoreActions } from '../actions';
  import { STORE_ACTIONS_CONTEXT_KEY, STORE_STATE_CONTEXT_KEY } from '../constants';
  import { isRowsEqual } from './helpers';

  import Editable from '../Editable/Editable.svelte';

  type Props = {
    row: TableRow;
  };

  const { row }: Props = $props();

  const tableState = getContext<TableStateStore>(STORE_STATE_CONTEXT_KEY);
  const { selectRow, newCategory, newRow, deleteSelectedRow, updateRow } =
    getContext<StoreActions>(STORE_ACTIONS_CONTEXT_KEY);

  let checked = $state(row.checked);
  let name = $state(row.name);
  let amount = $state(row.amount);
  let comment = $state(row.comment);

  $effect(() => {
    const updatingRow: TableRow = {
      id: row.id,
      checked,
      name,
      amount,
      comment,
    };

    if (isRowsEqual(row, updatingRow)) {
      return;
    }

    updateRow(updatingRow);
  });

  const menu = new Menu()
    .addItem((item) => {
      item.setTitle('New row');
      item.setIcon('between-horizontal-end');
      item.onClick(() => newRow());
    })
    .addItem((item) => {
      item.setTitle('New category');
      item.setIcon('table-rows-split');
      item.onClick(() => newCategory());
    })
    .addSeparator()
    .addItem((item) => {
      item.setTitle('Delete selected row');
      item.setIcon('list-x');
      item.onClick(deleteSelectedRow);
    });

  export const handleOnMenu = (event: MouseEvent) => {
    event.preventDefault();
    selectRow(row.id);
    menu.showAtMouseEvent(event);
  };

  export const handleOnRowClick = () => {
    selectRow(null);
  };
</script>

<tr
  class="row"
  class:selected={$tableState.selectedRowId === row.id}
  class:checked={row.checked}
  onclick={handleOnRowClick}
  oncontextmenu={handleOnMenu}
>
  <td class="check-wrapper">
    <div class="check">
      <input type="checkbox" name="checkbox" id="checkbox" bind:checked />
    </div>
  </td>

  <td>
    <Editable value={row.name} onChange={(value) => (name = String(value))} />
  </td>

  <td>
    <Editable value={row.amount} onChange={(value) => (amount = Number(value))} />
  </td>

  <td class="comment">
    <Editable value={row.comment} onChange={(value) => (comment = String(value))} />
  </td>
</tr>

<style>
  tr.row.selected,
  tr.row.selected:hover {
    background: var(--table-selection);
  }

  tr.row.checked,
  tr.row.checked:hover {
    background: var(--background-secondary);
  }

  .check-wrapper {
    padding: 0;
    position: relative;
  }

  .check {
    width: 100%;
    height: 100%;
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
