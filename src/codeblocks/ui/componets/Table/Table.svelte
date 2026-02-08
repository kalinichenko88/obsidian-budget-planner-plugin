<script lang="ts">
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
  import { debounce } from 'obsidian';
  import { DragAndDropManager } from './DragAndDrop/DragAndDropManager';

  type Props = {
    tableStore: TableStore;
    tableStateStore: TableStateStore;
    onTableChange: (categories: TableCategories, rows: TableRows) => void;
  };

  const { tableStore, tableStateStore, onTableChange }: Props = $props();

  untrack(() => {
    setContext(STORE_CONTEXT_KEY, tableStore);
    setContext(STORE_STATE_CONTEXT_KEY, tableStateStore);
  });

  const commitTableChange = debounce(
    (categories: TableCategories, rows: TableRows) => {
      if ($tableStateStore.isEditing) return;

      tableStateStore.update((s) => ({ ...s, isSaving: true }));
      try {
        onTableChange(categories, rows);
      } finally {
        setTimeout(() => tableStateStore.update((s) => ({ ...s, isSaving: false })), 0);
      }
    },
    100,
    true
  );

  const storeActions = untrack(() =>
    createStoreActions(tableStore, tableStateStore, commitTableChange)
  );
  setContext(STORE_ACTIONS_CONTEXT_KEY, storeActions);

  const { newCategory, newRow } = storeActions;
  let tableEl: HTMLTableElement;
  let dndManager: DragAndDropManager | null = null;

  const onBlur = (event: FocusEvent): void => {
    const newFocus = event.relatedTarget;
    if (!tableEl.contains(newFocus as Node)) {
      commitTableChange($tableStore.categories, $tableStore.rows);
    }
  };

  onMount(() => {
    tableEl.addEventListener('focusout', onBlur);

    dndManager = new DragAndDropManager(tableEl, storeActions);
    dndManager.init();
  });

  onDestroy(() => {
    tableEl.removeEventListener('focusout', onBlur);
    dndManager?.destroy();
  });

  $effect(() => {
    // Track categories and rows to refresh DnD when they change
    $tableStore.categories;
    $tableStore.rows;

    queueMicrotask(() => {
      dndManager?.refresh();
    });
  });

  $effect(() => {
    const disabled = $tableStateStore.isSaving || $tableStateStore.isEditing;
    dndManager?.setDisabled(disabled);
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

        <AddRow
          text="New Row"
          onClick={() => newRow(categoryId)}
          disabled={$tableStateStore.isSaving}
        />

        {#if $tableStore.categories.size > 1}
          <CategoryFooter {categoryId} />
        {/if}
      </tbody>
    {/each}

    <tbody class="static-row">
      <AddRow text="New Category" onClick={newCategory} disabled={$tableStateStore.isSaving} />
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
