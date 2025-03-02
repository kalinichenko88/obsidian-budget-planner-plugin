<script lang="ts">
  import { setContext } from 'svelte';

  import type { TableStateStore, TableStore, TableStoreValue } from '../../../models';
  import {
    STORE_CONTEXT_KEY,
    STORE_STATE_CONTEXT_KEY,
    STORE_ACTIONS_CONTEXT_KEY,
  } from './constants';
  import { createStoreActions } from './actions';

  import Head from './Head/Head.svelte';
  import CategoryRow from './CategoryRow/CategoryRow.svelte';
  import Row from './Row/Row.svelte';
  import CategoryFooter from './CategoryFooter/CategoryFooter.svelte';
  import Footer from './Footer/Footer.svelte';
  import AddRow from './AddRow/AddRow.svelte';

  type Props = {
    tableStore: TableStore;
    tableStateStore: TableStateStore;
    onChange: (data: TableStoreValue) => void;
  };

  const { tableStore, tableStateStore, onChange }: Props = $props();

  setContext(STORE_CONTEXT_KEY, tableStore);
  setContext(STORE_STATE_CONTEXT_KEY, tableStateStore);

  const storeActions = createStoreActions(tableStore, tableStateStore);
  setContext(STORE_ACTIONS_CONTEXT_KEY, storeActions);

  const { newCategory, newRow } = storeActions;

  let isFirstRun = true;

  tableStore.subscribe((value) => {
    if (isFirstRun) {
      isFirstRun = false;
      return;
    }
    onChange(value);
  });
</script>

<table class="table">
  <Head />

  <tbody>
    {#each $tableStore.categories.entries() as [categoryId, categoryName] (categoryId)}
      <CategoryRow {categoryId} {categoryName} />

      {#each $tableStore.rows.get(categoryId) || [] as row (row.id)}
        <Row {row} />
      {/each}

      <AddRow text="New Row" onClick={() => newRow(categoryId)} />

      <CategoryFooter {categoryId} />
    {/each}
  </tbody>

  <AddRow text="New Category" onClick={newCategory} />

  <Footer />
</table>

<style>
  .table {
    width: 100%;
    margin: 0;
    border-collapse: collapse;
  }
</style>
