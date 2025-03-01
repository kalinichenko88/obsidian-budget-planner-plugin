<script lang="ts">
  import { getContext } from 'svelte';
  import { Menu, debounce } from 'obsidian';

  import type { TableRow, TableStore } from '../../../../models';
  import type { StoreActions } from '../actions';
  import { moneyFormatter } from '../../../helpers/moneyFormatter';
  import { STORE_ACTIONS_CONTEXT_KEY, STORE_CONTEXT_KEY } from '../constants';

  import Cell from '../Cell/Cell.svelte';

  type Props = {
    row: TableRow;
  };

  let { row }: Props = $props();

  const store = getContext<TableStore>(STORE_CONTEXT_KEY);
  const { selectRow, newCategory, newRow, deleteSelectedRow } =
    getContext<StoreActions>(STORE_ACTIONS_CONTEXT_KEY);

  const selectedRowId = $derived($store.selectedRowId);
  let data = $state({ ...row });

  $effect(() => {
    console.log({ data });
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

  export const onUpdate = debounce((event: Event) => {
    console.log({ event });
    console.log((event.target as HTMLTableCellElement).innerText);
  }, 300);

  export function handleOnChange(event: string) {
    console.log({ event });
  }

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
  class:selected={selectedRowId === row.id}
  onclick={handleOnRowClick}
  oncontextmenu={handleOnMenu}
>
  <td class="check-wrapper">
    <div class="check">
      <input type="checkbox" name="checkbox" id="checkbox" value={data.checked} />
    </div>
  </td>

  <td>
    <Cell value={data.name} onChange={handleOnChange} />
  </td>

  <td class="amount">
    <Cell value={moneyFormatter.format(data.amount)} onChange={handleOnChange} />
  </td>

  <td class="comment">
    <Cell value={data.comment} onChange={handleOnChange} />
  </td>
</tr>

<style>
  .row {
    position: relative;
  }

  tr.row.selected,
  tr.row.selected:hover {
    background: var(--table-selection);
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

  .amount {
    text-align: right;
  }
</style>
