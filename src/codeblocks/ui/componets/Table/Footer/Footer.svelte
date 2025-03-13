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
      <span>COUNT:</span>{rowsCount}
      {#if isUnselectedShown}
        <br />
        <span>UNCHECKED:</span>{unselectedRowsCount}
      {/if}
    </th>
    <th
      ><span>SUM:</span>{moneyFormatter.format(rowsSum)}
      {#if isUnselectedSumShown}
        <br />{moneyFormatter.format(unselectedRowsSum)}
      {/if}
    </th>
    <th></th>
  </tr>
</tfoot>

<style>
  .summary > th {
    text-align: end;

    & > span {
      font-size: var(--font-smallest);
      color: var(--text-faint);
      font-weight: var(--font-normal);
      margin-right: 0.2rem;
    }
  }
</style>
