<script lang="ts">
  import { getContext } from 'svelte';

  import type { TableStore } from '../../../../models';
  import { moneyFormatter } from '../../../helpers/moneyFormatter';
  import { STORE_CONTEXT_KEY } from '../constants';

  const store = getContext<TableStore>(STORE_CONTEXT_KEY);

  const rowsCount = $derived.by(() => {
    return Array.from($store.rows.values()).reduce((acc, rows) => acc + rows.length, 0);
  });
  const rowsSum = $derived.by(() => {
    return Array.from($store.rows.values()).reduce(
      (acc, rows) => acc + rows.reduce((acc, row) => acc + row.amount, 0),
      0
    );
  });

  const unselectedRowsCount = $derived.by(() => {
    return Array.from($store.rows.values()).reduce(
      (acc, rows) => acc + rows.filter((row) => !row.checked).length,
      0
    );
  });
  const unselectedRowsSum = $derived.by(() => {
    return Array.from($store.rows.values()).reduce(
      (acc, rows) =>
        acc + rows.filter((row) => !row.checked).reduce((acc, row) => acc + row.amount, 0),
      0
    );
  });

  const isUnselectedShown = $derived(unselectedRowsCount > 0 && unselectedRowsCount !== rowsCount);
  const isUnselectedSumShown = $derived(unselectedRowsSum > 0 && unselectedRowsSum !== rowsSum);
</script>

<tfoot>
  <tr class="summary">
    <th colspan="2">
      <div class="wrapper">
        <span class="label">COUNT:</span>
        <div>
          {rowsCount}
        </div>
        {#if isUnselectedShown}
          <span class="label">UNCHECKED:</span>
          <div>{unselectedRowsCount}</div>
        {/if}
      </div>
    </th>
    <th
      ><div class="wrapper">
        <span class="label">SUM:</span>
        <div>{moneyFormatter.format(rowsSum)}</div>
        {#if isUnselectedSumShown}
          <span class="label">UNCHECKED:</span>
          <div>{moneyFormatter.format(unselectedRowsSum)}</div>
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
    align-items: center;
    justify-items: end;
    gap: 0 0.5rem;
  }

  .label {
    font-size: calc(var(--font-smallest) - 5%);
    font-weight: var(--font-normal);
  }
</style>
