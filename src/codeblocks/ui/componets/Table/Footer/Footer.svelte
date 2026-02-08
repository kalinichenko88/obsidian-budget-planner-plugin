<script lang="ts">
  import { getContext } from 'svelte';

  import type { TableRow, TableStore } from '../../../../models';
  import { moneyFormatter } from '../../../helpers/moneyFormatter';
  import { STORE_CONTEXT_KEY } from '../constants';

  const store = getContext<TableStore>(STORE_CONTEXT_KEY);

  const allRows = $derived(
    Array.from($store.rows.values()).reduce<TableRow[]>((acc, rows) => acc.concat(rows), [])
  );
  const uncheckedRows = $derived(allRows.filter((row) => !row.checked));

  const rowsCount = $derived(allRows.length);
  const rowsSum = $derived(allRows.reduce((acc, row) => acc + row.amount, 0));

  const uncheckedRowsCount = $derived(uncheckedRows.length);
  const uncheckedRowsSum = $derived(uncheckedRows.reduce((acc, row) => acc + row.amount, 0));

  const isUncheckedShown = $derived(uncheckedRowsCount > 0 && uncheckedRowsCount !== rowsCount);
  const isUncheckedSumShown = $derived(uncheckedRowsSum > 0 && uncheckedRowsSum !== rowsSum);
</script>

<tfoot>
  <tr class="summary">
    <th colspan="2">
      <div class="wrapper">
        <span class="label">COUNT:</span>
        <div>
          {rowsCount}
        </div>
        {#if isUncheckedShown}
          <span class="label">UNCHECKED:</span>
          <div>{uncheckedRowsCount}</div>
        {/if}
      </div>
    </th>
    <th
      ><div class="wrapper">
        <span class="label">SUM:</span>
        <div>{moneyFormatter.format(rowsSum)}</div>
        {#if isUncheckedSumShown}
          <span class="label">UNCHECKED:</span>
          <div>{moneyFormatter.format(uncheckedRowsSum)}</div>
        {/if}
      </div>
    </th>
    <th></th>
  </tr>
</tfoot>

<style>
  .summary > th {
    font-size: var(--font-smallest);
  }

  .wrapper {
    display: grid;
    grid-template-columns: auto max-content;
    text-align: end;
    align-items: baseline;
    justify-items: end;
    gap: 0 0.5rem;
    padding: var(--size-2-2) var(--size-4-2);
  }

  .label {
    font-size: calc(var(--font-smallest) - 5%);
    font-weight: var(--font-normal);
  }
</style>
