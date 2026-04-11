<script lang="ts">
  import { get } from 'svelte/store';
  import { onDestroy, onMount, setContext, untrack } from 'svelte';

  import type { TableCategories, TableRows, TableStateStore, TableStore } from '../../../models';
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
  import { DragAndDropManager } from './DragAndDrop/DragAndDropManager';

  type Props = {
    tableStore: TableStore;
    tableStateStore: TableStateStore;
    onTableChange: (categories: TableCategories, rows: TableRows) => void;
    markDirty?: () => void;
  };

  const { tableStore, tableStateStore, onTableChange, markDirty }: Props = $props();

  untrack(() => {
    setContext(STORE_CONTEXT_KEY, tableStore);
    setContext(STORE_STATE_CONTEXT_KEY, tableStateStore);
  });

  const syncToDocument = (): void => {
    const state = get(tableStore);
    onTableChange(state.categories, state.rows);
  };

  const storeActions = untrack(() =>
    createStoreActions(tableStore, tableStateStore, syncToDocument, markDirty)
  );
  setContext(STORE_ACTIONS_CONTEXT_KEY, storeActions);

  const { newCategory, newRow } = storeActions;
  let tableEl: HTMLTableElement;
  let dndManager: DragAndDropManager | null = null;

  onMount(() => {
    dndManager = new DragAndDropManager(tableEl, storeActions);
    dndManager.init();
  });

  onDestroy(() => {
    dndManager?.destroy();
  });

  let prevStructure = '';
  $effect(() => {
    const cats = [...$tableStore.categories.keys()].join(',');
    const rows = [...$tableStore.rows.values()].flatMap((rs) => rs.map((r) => r.id)).join(',');
    const structure = cats + '|' + rows;

    if (structure !== prevStructure) {
      prevStructure = structure;
      queueMicrotask(() => {
        dndManager?.refresh();
      });
    }
  });

  $effect(() => {
    dndManager?.setDisabled($tableStateStore.isEditing);
  });
</script>

<div class="table-container">
  <table class="table" border="1" bind:this={tableEl}>
    <Head />

    {#each $tableStore.categories.entries() as [categoryId, categoryName] (categoryId)}
      <tbody class="category-group" data-category-id={categoryId}>
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
      </tbody>
    {/each}

    <tbody class="static-row">
      <AddRow text="New Category" onClick={newCategory} />
    </tbody>

    <Footer />
  </table>
</div>

<style>
  .table-container {
    position: relative;
    width: 100%;
  }

  .table {
    width: 100%;
    margin: 0;
    border-collapse: collapse;
    border-spacing: 0;
    border-color: var(--table-border-color);
    border-width: var(--table-border-width);
    table-layout: fixed;
  }

  :global(.sortable-ghost-row) {
    opacity: 0.4;
    background: var(--interactive-accent) !important;
  }

  :global(.sortable-ghost-category) {
    opacity: 0.4;
    background: var(--interactive-accent) !important;
  }

  :global(.sortable-chosen-row) {
    background: var(--table-selection) !important;
  }

  :global(.sortable-chosen-category) {
    background: var(--table-selection) !important;
  }
</style>
