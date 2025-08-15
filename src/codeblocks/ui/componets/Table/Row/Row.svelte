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
  const { selectRow, newCategory, newRow, deleteSelectedRow, updateRow, toggleEditing } =
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

  export const handleOnMenu = (event: MouseEvent): void => {
    event.preventDefault();
    selectRow(row.id);
    menu.showAtMouseEvent(event);
  };

  export const handleOnRowClick = (): void => {
    if ($tableState.isSaving) return;
    selectRow(null);
  };

  export const handleOnCheckboxClick = (): void => {
    if ($tableState.isSaving) return;
    selectRow(null);
    checked = !checked;
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
    <div
      class="check"
      role="button"
      tabindex={$tableState.isSaving ? -1 : 0}
      onclick={handleOnCheckboxClick}
      onkeydown={handleOnCheckboxClick}
    >
      <input
        type="checkbox"
        name="checkbox"
        id={`checkbox-${row.id}`}
        checked={row.checked}
        disabled={$tableState.isSaving}
        onchange={(value: Event) => {
          checked = (value.target as HTMLInputElement).checked;
        }}
      />
    </div>
  </td>

  <td class="cell">
    <Editable
      value={row.name}
      onChange={(value) => (name = String(value))}
      onEditingChange={toggleEditing}
      disabled={$tableState.isSaving}
    />
  </td>

  <td class="cell">
    <Editable
      value={row.amount}
      onChange={(value) => (amount = Number(value))}
      onEditingChange={toggleEditing}
      disabled={$tableState.isSaving}
    />
  </td>

  <td class="cell">
    <Editable
      value={row.comment}
      onChange={(value) => (comment = String(value))}
      onEditingChange={toggleEditing}
      disabled={$tableState.isSaving}
    />
  </td>
</tr>

<style>
  tr.row.selected,
  tr.row.selected:hover {
    background: var(--table-selection);
  }

  tr.row.checked,
  tr.row.checked:hover {
    background: var(--color-base-20);
    color: var(--color-base-60);
  }

  .check-wrapper {
    padding: 0;
  }

  .check {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--size-2-2);

    & > input {
      margin: 0;
    }
  }

  .cell {
    position: relative;
    padding: var(--size-2-2) var(--size-4-2);
  }
</style>
