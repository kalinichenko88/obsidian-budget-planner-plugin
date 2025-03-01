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

  let rowsCount: number = $state(0);
  let rowsSum: number = $state(0);

  $effect(() => {
    rowsCount = rows.length;
    rowsSum = rows.reduce((acc, value) => acc + value.amount, 0);
  });
</script>

<tr class="meta">
  <td></td>
  <td class="cell">
    <span>COUNT:</span>
    {rowsCount}
  </td>
  <td class="cell">
    <span>SUM:</span>
    {moneyFormatter.format(rowsSum)}
  </td>
  <td></td>
</tr>

<style>
  .cell {
    text-align: end;
    font-size: var(--font-smallest);
  }

  .cell > span {
    font-size: var(--font-smallest);
  }
</style>
