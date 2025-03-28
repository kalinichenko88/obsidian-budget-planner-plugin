<script lang="ts">
  import { setContext } from 'svelte';
  import { debounce } from 'obsidian';

  import type { TableStateStore, TableStore, TableStoreValues } from '../../../models';
  import { createStoreActions } from './actions';
  import {
    STORE_CONTEXT_KEY,
    STORE_STATE_CONTEXT_KEY,
    STORE_ACTIONS_CONTEXT_KEY,
  } from './constants';

  import Head from './Head/Head.svelte';
  import CategoryRow from './CategoryRow/CategoryRow.svelte';
  import Row from './Row/Row.svelte';
  import CategoryFooter from './CategoryFooter/CategoryFooter.svelte';
  import Footer from './Footer/Footer.svelte';
  import AddRow from './AddRow/AddRow.svelte';

  type Props = {
    tableStore: TableStore;
    tableStateStore: TableStateStore;
    onSave: (data: TableStoreValues) => void;
  };

  const { tableStore, tableStateStore, onSave }: Props = $props();

  setContext(STORE_CONTEXT_KEY, tableStore);
  setContext(STORE_STATE_CONTEXT_KEY, tableStateStore);

  const storeActions = createStoreActions(tableStore, tableStateStore);
  setContext(STORE_ACTIONS_CONTEXT_KEY, storeActions);

  const { newCategory, newRow } = storeActions;

  let isFirstRun = true;

  const hadleOnTableUpdate = debounce(
    (value: TableStoreValues) => {
      if (isFirstRun) {
        isFirstRun = false;
        return;
      }
      if ($tableStateStore.isEditing) {
        return;
      }
      onSave(value);
    },
    2_000,
    true
  );

  tableStore.subscribe(hadleOnTableUpdate);
</script>

<table class="table">
  <Head />

  <tbody>
    {#each $tableStore.categories.entries() as [categoryId, categoryName] (categoryId)}
      <CategoryRow
        {categoryId}
        {categoryName}
        isDeletingEnabled={$tableStore.categories.size > 1}
      />

      {#each $tableStore.rows.get(categoryId) || [] as row (row.id)}
        <Row {row} />
      {/each}

      <AddRow text="New Row" onClick={() => newRow(categoryId)} />

      {#if $tableStore.categories.size > 1}
        <CategoryFooter {categoryId} />
      {/if}
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
