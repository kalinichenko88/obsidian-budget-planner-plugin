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
    <div class="wrapper">
      <span class="label">COUNT:</span>
      <div>{rowsCount}</div>
      {#if isUnselectedShown}
        <span class="label">UNCHECKED:</span>
        <div>{uncheckedRowsCount}</div>
      {/if}
    </div>
  </td>

  <td class="cell">
    <div class="wrapper">
      <span class="label">SUM:</span>
      <div>{moneyFormatter.format(rowsSum)}</div>
      {#if isUnselectedSumShown}
        <span class="label">UNCHECKED:</span>
        <div>{moneyFormatter.format(uncheckedRowsSum)}</div>
      {/if}
    </div>
  </td>

  <td></td>
</tr>

<style>
  .cell {
    font-size: var(--font-smallest);

    > .wrapper {
      display: grid;
      grid-template-columns: auto max-content;
      text-align: end;
      align-items: center;
      justify-items: end;
      gap: 0 0.5rem;
    }

    .label {
      font-size: var(--font-smallest);
    }
  }
</style>
