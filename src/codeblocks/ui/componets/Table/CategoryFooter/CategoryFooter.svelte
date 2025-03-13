<script lang="ts">
  import { getContext } from 'svelte';

  import type { CategoryId, TableStore } from '../../../../models';
  import { moneyFormatter } from '../../../helpers/moneyFormatter';
  import { STORE_CONTEXT_KEY } from '../constants';

  type Props = {
    categoryId: CategoryId;
  };

  const { categoryId }: Props = $props();

  const store = getContext<TableStore>(STORE_CONTEXT_KEY);
  const rows = $derived($store.rows.get(categoryId) || []);
  const unselectedRows = $derived(rows.filter((row) => !row.checked));

  const rowsCount = $derived(rows.length);
  const rowsSum = $derived(rows.reduce((acc, value) => acc + value.amount, 0));

  const uncheckedRowsCount = $derived(unselectedRows.length);
  const uncheckedRowsSum = $derived(unselectedRows.reduce((acc, value) => acc + value.amount, 0));

  const isUnselectedShown = $derived(uncheckedRowsCount > 0 && uncheckedRowsCount !== rowsCount);
  const isUnselectedSumShown = $derived(uncheckedRowsSum > 0 && uncheckedRowsSum !== rowsSum);
</script>

<tr class="meta">
  <td></td>
  <td class="cell">
    <span>COUNT:</span>
    {rowsCount}
    {#if isUnselectedShown}
      <br />
      <span>UNCHECKED:</span>{uncheckedRowsCount}
    {/if}
  </td>
  <td class="cell">
    <span>SUM:</span>
    {moneyFormatter.format(rowsSum)}
    {#if isUnselectedSumShown}
      <br />
      <span>UNCHECKED:</span>{moneyFormatter.format(uncheckedRowsSum)}
    {/if}
  </td>
  <td></td>
</tr>

<style>
  .cell {
    text-align: end;
    white-space: nowrap;
    font-size: var(--font-smallest);
  }

  .cell > span {
    font-size: var(--font-smallest);
  }
</style>
